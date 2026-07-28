import type { Request, Response } from "express";
import { db } from "../db/index.js";
import { analytics, urls } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { encodeBase62 } from "../utils/base62.js";
import { analyticsHelper } from "../utils/analyticsHelper.js";
import { error } from "node:console";

type RedirectParams = {
  shortCode: string;
};

export async function short(req: Request, res: Response) {
  try {
    const { url, customAlias, expiresAt } = req.body;

    const age = new Date(expiresAt);

    if (!url) {
      return res.status(400).json({ message: "URL is required!" });
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
      } else {
        await db.insert(urls).values({
          url,
          short: customAlias,
          customAlias: 1,
          age,
          status: 1,
        });

        shortCode += customAlias;
      }
    } else {
      const result = await db.insert(urls).values({
        url,
        customAlias: 0,
        age,
        status: 1,
      });

      const id = result[0].insertId;

      shortCode = encodeBase62(id);
      await db
        .update(urls)
        .set({
          short: shortCode,
        })
        .where(eq(urls.id, id));
    }

    return res.status(201).json({
      shortCode,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

export async function redirect(req: Request<RedirectParams>, res: Response) {
  try {
    const { shortCode } = req.params;

    if (!shortCode) {
      return res.status(400).json({ message: "Bad Request!" });
    }

    const [url] = await db
      .select()
      .from(urls)
      .where(eq(urls.short, shortCode))
      .limit(1);

    if (!url) {
      return res.status(404).json({ message: "Not found!" });
    }

    if (url.status === 0) {
      return res.status(410).json({ message: "Not active!" });
    }

    if (url.age && new Date(url.age) < new Date()) {
      return res.status(410).json({ message: "Expired!" });
    }

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

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
}
