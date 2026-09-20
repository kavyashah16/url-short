import type { Request, Response } from "express";
import { db } from "../db/index.js";
import { analytics, urls } from "../db/schema.js";
import { and, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { analyticsHelper } from "../utils/analyticsHelper.js";
import bcrypt from "bcrypt";
import { customAlphabet } from "nanoid";
import dotenv from "dotenv";
import { isValidAlias, isValidUrl, normalizeURL } from "../utils/urlUtils.js";
import { redisClient } from "../db/redis.js";
import { analyticsQueue } from "../queues/analyticsQueue.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
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

export const short = asyncHandler(async (req: Request, res: Response) => {
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
      throw new AppError("Already exists!", 409);
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
        const isCollision = dbError.errno === 1062 || dbError.code === "23505";
        if (isCollision) {
          attempts++;
          continue;
        }
        throw dbError;
      }
    }

    if (!inserted) {
      throw new AppError("Failed to generate unique short link.", 500);
    }
  }

  return res.status(201).json({ shortCode });
});

export const redirect = asyncHandler(
  async (req: Request<RedirectParams>, res: Response) => {
    const { shortCode } = req.params;
    const clientPass = req.headers["x-link-password"];

    if (!shortCode) {
      throw new AppError("Bad Request", 400);
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
      throw new AppError("Not found!", 404);
    }

    if (url.status === 0) {
      throw new AppError("Link is deactivated!", 403);
    }

    if (url.age && new Date(url.age) < new Date()) {
      throw new AppError("Expired!", 410);
    }

    if (url.isLimit === 1) {
      if (
        url.clickCount != null &&
        url.clickLimit != null &&
        url.clickCount >= url.clickLimit
      ) {
        await db.update(urls).set({ status: 0 }).where(eq(urls.id, url.id));
        throw new AppError("Limit reached!", 410);
      }
    }

    if (url.isPass === 1) {
      if (!clientPass || typeof clientPass !== "string") {
        throw new AppError("Password required!", 403, {
          requiresPassword: true,
        });
      }
      const match = await bcrypt.compare(clientPass, url.password || "");

      if (!match) {
        throw new AppError("Password Invalid!", 401);
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
  },
);

export const updateUrl = asyncHandler(async (req: Request, res: Response) => {
  const { shortCode } = req.params;
  const { url, password, clickLimit, status } = req.body;

  if (!shortCode || typeof shortCode !== "string") {
    throw new AppError("Invalid shortCode parameter!", 400);
  }

  const [exists] = await db
    .select()
    .from(urls)
    .where(eq(urls.short, shortCode))
    .limit(1);

  if (!exists || exists.status === -1) {
    throw new AppError("Link not found!", 404);
  }

  if (!req.user || exists.userId !== Number(req.user.userId)) {
    throw new AppError("Forbidden: You do not own this URL.", 403);
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
});

export const deleteUrl = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (typeof id !== "string") {
    throw new AppError("Invalid ID!", 400);
  }
  const val = parseInt(id, 10);
  if (isNaN(val)) {
    throw new AppError("Invalid ID!", 400);
  }

  const [exist] = await db.select().from(urls).where(eq(urls.id, val)).limit(1);

  if (!exist || exist.status === -1) {
    throw new AppError("Link doesn't exist!", 404);
  }

  if (!req.user || exist.userId !== Number(req.user.userId)) {
    throw new AppError("Forbidden: You do not own this URL.", 403);
  }

  await db.update(urls).set({ status: -1 }).where(eq(urls.id, val));

  try {
    await redisClient.del(`url:${exist.short}`);
  } catch (cacheErr) {
    console.error("Failed to invalidate cache:", cacheErr);
  }

  return res.status(200).json({ message: "Deleted successfully!" });
});

export const getPublicStats = asyncHandler(
  async (req: Request, res: Response) => {
    const [stats] = await db
      .select({
        totalLinks: sql<number>`count(*)`,
        totalClicks: sql<number>`coalesce(sum(${urls.clickCount}), 0)`,
      })
      .from(urls)
      .where(ne(urls.status, -1));

    return res.status(200).json({
      totalLinks: Number(stats?.totalLinks ?? 0),
      totalClicks: Number(stats?.totalClicks ?? 0),
    });
  },
);

export const claimGuestLinks = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const { shortCodes } = req.body;

    if (!Array.isArray(shortCodes)) {
      throw new AppError("shortCodes must be an array.", 400);
    }

    const cleanCodes = [
      ...new Set(
        shortCodes
          .filter((code) => typeof code === "string")
          .map((code) => code.trim())
          .filter(Boolean),
      ),
    ].slice(0, 50);

    if (cleanCodes.length === 0) {
      return res.status(200).json({ claimed: 0 });
    }

    const ownedLinks = await db
      .select({ id: urls.id, short: urls.short })
      .from(urls)
      .where(
        and(
          inArray(urls.short, cleanCodes),
          isNull(urls.userId),
          ne(urls.status, -1),
        ),
      );

    if (ownedLinks.length === 0) {
      return res.status(200).json({ claimed: 0 });
    }

    await db
      .update(urls)
      .set({ userId: Number(req.user.userId) })
      .where(inArray(urls.id, ownedLinks.map((link) => link.id)));

    await Promise.all(
      ownedLinks.map((link) => redisClient.del(`url:${link.short}`).catch(() => null)),
    );

    return res.status(200).json({ claimed: ownedLinks.length });
  },
);

export const getMyLinks = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Unauthorized", 401);
  }

  const links = await db
    .select({
      id: urls.id,
      url: urls.url,
      short: urls.short,
      customAlias: urls.customAlias,
      age: urls.age,
      isPass: urls.isPass,
      clickLimit: urls.clickLimit,
      isLimit: urls.isLimit,
      clickCount: urls.clickCount,
      status: urls.status,
    })
    .from(urls)
    .where(and(eq(urls.userId, Number(req.user.userId)), ne(urls.status, -1)))
    .orderBy(desc(urls.id));

  return res.status(200).json({ links });
});

export const getLinkDetails = asyncHandler(
  async (req: Request, res: Response) => {
    const { shortCode } = req.params;
    if (!shortCode || typeof shortCode !== "string") {
      throw new AppError("Invalid shortCode parameter!", 400);
    }

    const [link] = await db
      .select()
      .from(urls)
      .where(eq(urls.short, shortCode))
      .limit(1);

    if (!link || link.status === -1) {
      throw new AppError("Link not found!", 404);
    }

    if (!req.user || link.userId !== Number(req.user.userId)) {
      throw new AppError("Forbidden: You do not own this URL.", 403);
    }

    const { password, ...safeLink } = link;
    const [countryRows, browserRows, deviceRows, referrerRows, recentClicks] =
      await Promise.all([
        db
          .select({
            country: analytics.country,
            clicks: sql<number>`count(*)`,
          })
          .from(analytics)
          .where(eq(analytics.urlId, link.id))
          .groupBy(analytics.country)
          .orderBy(sql`count(*) desc`),
        db
          .select({
            browser: analytics.browser,
            clicks: sql<number>`count(*)`,
          })
          .from(analytics)
          .where(eq(analytics.urlId, link.id))
          .groupBy(analytics.browser)
          .orderBy(sql`count(*) desc`),
        db
          .select({
            device: analytics.device,
            clicks: sql<number>`count(*)`,
          })
          .from(analytics)
          .where(eq(analytics.urlId, link.id))
          .groupBy(analytics.device)
          .orderBy(sql`count(*) desc`),
        db
          .select({
            referrer: analytics.referrer,
            clicks: sql<number>`count(*)`,
          })
          .from(analytics)
          .where(eq(analytics.urlId, link.id))
          .groupBy(analytics.referrer)
          .orderBy(sql`count(*) desc`),
        db
          .select({
            times: analytics.times,
            country: analytics.country,
            browser: analytics.browser,
            device: analytics.device,
            referrer: analytics.referrer,
          })
          .from(analytics)
          .where(eq(analytics.urlId, link.id))
          .orderBy(desc(analytics.times))
          .limit(12),
      ]);

    return res.status(200).json({
      link: safeLink,
      analytics: {
        countries: countryRows.map((row) => ({
          country: row.country,
          clicks: Number(row.clicks),
        })),
        browsers: browserRows.map((row) => ({
          browser: row.browser,
          clicks: Number(row.clicks),
        })),
        devices: deviceRows.map((row) => ({
          device: row.device,
          clicks: Number(row.clicks),
        })),
        referrers: referrerRows.map((row) => ({
          referrer: row.referrer,
          clicks: Number(row.clicks),
        })),
        recentClicks,
      },
    });
  },
);
