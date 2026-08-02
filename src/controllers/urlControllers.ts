import type { Request, Response } from "express";
import { db } from "../db/index.js";
import { analytics, urls } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";
import { analyticsHelper } from "../utils/analyticsHelper.js";
import bcrypt from "bcrypt";
import { customAlphabet } from "nanoid";
import dotenv from "dotenv";
dotenv.config();

const CHARSET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

const LENGTH = Number(process.env.LENGTH);

if (Number.isNaN(LENGTH)) {
  throw new Error("LENGTH must be a valid number in the .env file");
}

const generateRandomCode = customAlphabet(CHARSET, LENGTH);

type RedirectParams = {
  shortCode: string;
};

export async function short(req: Request, res: Response) {
  try {
    const { url, customAlias, expiresAt, password, clickLimit } = req.body;

    if (!url) {
      return res.status(400).json({ message: "URL is required!" });
    }

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
        url,
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
            url,
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

    const [url] = await db
      .select()
      .from(urls)
      .where(eq(urls.short, shortCode))
      .limit(1);

    if (!url || url.status === -1) {
      return res.status(404).json({ message: "Not found!" });
    }

    if (url.status === 0) {
      return res.status(410).json({ message: "Not active!" });
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
        return res.status(410).json({ message: "Limited reached!" });
      }
    }

    if (url.isPass === 1) {
      if (!clientPass || typeof clientPass != "string") {
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

    db.insert(analytics)
      .values({
        urlId: url.id,
        ipAddress: metaData.ipAddress,
        country: metaData.country,
        browser: metaData.browser,
        device: metaData.device,
        referrer: metaData.referrer,
      })
      .catch((err) => {
        console.error("Async Analytics Logging Failure:", err);
      });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function updateUrl(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { url, password, clickLimit, status } = req.body;

    if (typeof id != "string") {
      return res.status(400).json({ message: "Invalid!" });
    }

    const urlId = parseInt(id, 10);
    if (isNaN(urlId)) {
      return res.status(400).json({ message: "Invalid!" });
    }

    const [exists] = await db
      .select()
      .from(urls)
      .where(eq(urls.id, urlId))
      .limit(1);

    if (!exists) {
      return res.status(404).json({ message: "Link not found!" });
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

    await db.update(urls).set(updatedValues).where(eq(urls.id, urlId));
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
      return res.status(400).json({ message: "Invalid!" });
    }
    const val = parseInt(id, 10);
    if (isNaN(val)) {
      return res.status(400).json({ message: "Invalid!" });
    }

    const [exist] = await db
      .select()
      .from(urls)
      .where(eq(urls.id, val))
      .limit(1);

    if (!exist) {
      return res.status(404).json({ message: "Doesn't Exist" });
    }

    await db.update(urls).set({ status: -1 }).where(eq(urls.id, val));
    return res.status(200).json({ message: "Deleted!" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
