import type { Request, Response } from "express";
import { db } from "../db/index.js";
import { analytics, urls } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";
import { analyticsHelper } from "../utils/analyticsHelper.js";
import bcrypt from "bcrypt";
import { customAlphabet } from "nanoid";
import dotenv from "dotenv";
import { isValidAlias, isValidUrl, normalizeURL } from "../utils/urlUtils.js";
import { redisClient } from "../db/redis.js";
import { analyticsQueue } from "../queues/analyticsQueue.js";
dotenv.config();

const CHARSET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

const LENGTH = Number(process.env.LENGTH);

if (Number.isNaN(LENGTH) || LENGTH < 6) {
  throw new Error(
    "LENGTH must be a number >= 6 in the .env file (shorter codes collide too often and are easier to guess).",
  );
}

const generateRandomCode = customAlphabet(CHARSET, LENGTH);

const CACHE_TTL_SECONDS = 3600;

type RedirectParams = {
  shortCode: string;
};

export async function short(req: Request, res: Response) {
  try {
    const { url, customAlias, expiresAt, password, clickLimit } = req.body;

    const normalizedUrl = normalizeURL(url);

    const userId = req.user?.userId ? Number(req.user.userId) : null;
    const age = expiresAt ? new Date(expiresAt) : null;

    let hashPass = null;
    let isPass = 0;

    if (password && password.trim() !== "") {
      hashPass = await bcrypt.hash(password, 10);
      isPass = 1;
    }

    let parseLimit = null;
    let isLimit = 0;
    if (clickLimit !== undefined && clickLimit !== null) {
      const val = parseInt(clickLimit, 10);
      if (!isNaN(val) && val > 0) {
        parseLimit = val;
        isLimit = 1;
      }
    }

    let shortCode = "";

    if (customAlias) {
      const [exist] = await db
        .select()
        .from(urls)
        .where(eq(urls.short, customAlias))
        .limit(1);

      if (exist) {
        return res.status(409).json({ message: "Already exists!" });
      }

      await db.insert(urls).values({
        userId,
        url: normalizedUrl,
        short: customAlias,
        customAlias: 1,
        age,
        status: 1,
        password: hashPass,
        isPass,
        clickLimit: parseLimit,
        isLimit,
        clickCount: 0,
      });

      shortCode = customAlias;
    } else {
      const MAX_RETRIES = 3;
      let attempts = 0;
      let inserted = false;

      while (attempts < MAX_RETRIES && !inserted) {
        shortCode = generateRandomCode();
        try {
          await db.insert(urls).values({
            userId,
            url: normalizedUrl,
            short: shortCode,
            customAlias: 0,
            age,
            status: 1,
            password: hashPass,
            isPass,
            clickLimit: parseLimit,
            isLimit,
            clickCount: 0,
          });
          inserted = true;
        } catch (dbError: any) {
          const isCollision =
            dbError.errno === 1062 || dbError.code === "23505";
          if (isCollision) {
            attempts++;
            continue;
          }
          throw dbError;
        }
      }

      if (!inserted) {
        return res
          .status(500)
          .json({ message: "Failed to generate unique short link." });
      }
    }

    return res.status(201).json({ shortCode });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function redirect(req: Request<RedirectParams>, res: Response) {
  try {
    const { shortCode } = req.params;
    const clientPass = req.headers["x-link-password"];

    if (!shortCode) {
      return res.status(400).json({ message: "Bad Request!" });
    }

    let url: typeof urls.$inferSelect | undefined;

    try {
      const cached = await redisClient.get(`url:${shortCode}`);
      if (cached) url = JSON.parse(cached);
    } catch (error) {
      console.error("Redis unavailable, falling back to DB:", error);
    }

    if (!url) {
      [url] = await db
        .select()
        .from(urls)
        .where(eq(urls.short, shortCode))
        .limit(1);

      if (url && url.status !== -1 && url.isLimit !== 1) {
        try {
          await redisClient.set(`url:${shortCode}`, JSON.stringify(url), {
            EX: CACHE_TTL_SECONDS,
          });
        } catch (cacheErr) {
          console.error("Failed to populate cache:", cacheErr);
        }
      }
    }

    if (!url || url.status === -1) {
      return res.status(404).json({ message: "Not found!" });
    }

    if (url.status === 0) {
      return res.status(403).json({ message: "Link is deactivated!" });
    }

    if (url.age && new Date(url.age) < new Date()) {
      return res.status(410).json({ message: "Expired!" });
    }

    if (url.isLimit === 1) {
      if (
        url.clickCount != null &&
        url.clickLimit != null &&
        url.clickCount >= url.clickLimit
      ) {
        await db.update(urls).set({ status: 0 }).where(eq(urls.id, url.id));
        return res.status(410).json({ message: "Limit reached!" });
      }
    }

    if (url.isPass === 1) {
      if (!clientPass || typeof clientPass !== "string") {
        return res
          .status(403)
          .json({ message: "Password required!", requiresPassword: true });
      }
      const match = await bcrypt.compare(clientPass, url.password || "");

      if (!match) {
        return res.status(401).json({ message: "Password Invalid!" });
      }
    }

    await db
      .update(urls)
      .set({ clickCount: sql`${urls.clickCount} + 1` })
      .where(eq(urls.id, url.id));

    res.redirect(302, url.url);

    const metaData = analyticsHelper(req);

    analyticsQueue
      .add("log-click", {
        urlId: url.id,
        ipAddress: metaData.ipAddress,
        country: metaData.country,
        browser: metaData.browser,
        device: metaData.device,
        referrer: metaData.referrer,
      })
      .catch((err) => {
        console.error("Failed to enqueue analytics job:", err);
      });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function updateUrl(req: Request, res: Response) {
  try {
    const { shortCode } = req.params;
    const { url, password, clickLimit, status } = req.body;

    if (!shortCode || typeof shortCode !== "string") {
      return res.status(400).json({ message: "Invalid shortCode parameter!" });
    }

    const [exists] = await db
      .select()
      .from(urls)
      .where(eq(urls.short, shortCode))
      .limit(1);

    if (!exists || exists.status === -1) {
      return res.status(404).json({ message: "Link not found!" });
    }

    if (!req.user || exists.userId !== req.user.userId) {
      return res
        .status(403)
        .json({ message: "Forbidden: You do not own this URL." });
    }

    let updatedValues: Record<string, any> = {};

    if (url) updatedValues.url = url;
    if (status !== undefined) updatedValues.status = status;

    if (password !== undefined) {
      if (password.trim() === "") {
        updatedValues.password = null;
        updatedValues.isPass = 0;
      } else {
        updatedValues.password = await bcrypt.hash(password, 10);
        updatedValues.isPass = 1;
      }
    }

    if (clickLimit !== undefined) {
      if (clickLimit === null || clickLimit === "") {
        updatedValues.clickLimit = null;
        updatedValues.isLimit = 0;
      } else {
        const val = parseInt(clickLimit, 10);
        if (!isNaN(val) && val > 0) {
          updatedValues.clickLimit = val;
          updatedValues.isLimit = 1;
        }
      }
    }

    await db.update(urls).set(updatedValues).where(eq(urls.id, exists.id));

    try {
      await redisClient.del(`url:${shortCode}`);
    } catch (cacheErr) {
      console.error("Failed to invalidate cache:", cacheErr);
    }

    return res.status(200).json({ message: "Short URL updated successfully!" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function deleteUrl(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (typeof id !== "string") {
      return res.status(400).json({ message: "Invalid ID!" });
    }
    const val = parseInt(id, 10);
    if (isNaN(val)) {
      return res.status(400).json({ message: "Invalid ID!" });
    }

    const [exist] = await db
      .select()
      .from(urls)
      .where(eq(urls.id, val))
      .limit(1);

    if (!exist || exist.status === -1) {
      return res.status(404).json({ message: "Link doesn't exist!" });
    }

    if (!req.user || exist.userId !== req.user.userId) {
      return res
        .status(403)
        .json({ message: "Forbidden: You do not own this URL." });
    }

    await db.update(urls).set({ status: -1 }).where(eq(urls.id, val));

    try {
      await redisClient.del(`url:${exist.short}`);
    } catch (cacheErr) {
      console.error("Failed to invalidate cache:", cacheErr);
    }

    return res.status(200).json({ message: "Deleted successfully!" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
