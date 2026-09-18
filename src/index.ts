import express, { type Request, type Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import urlRoutes from "./routes/urlRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import { pinoHttp } from "pino-http";
import { logger } from "./utils/logger.js";
import { errorHandler } from "./middleWare/errorHandler.js";
import { db } from "./db/index.js";
import { sql } from "drizzle-orm";
import { redisClient } from "./db/redis.js";

dotenv.config();
const app = express();

const PORT = process.env.PORT || 5000;

app.set("trust proxy", 1);
app.use(cors());
app.use(express.json());
app.use(pinoHttp({ logger }));

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "Ok" });
});

app.get("/health/ready", async (req: Request, res: Response) => {
  const checks: Record<string, "ok" | "error"> = {
    database: "ok",
    redis: "ok",
  };

  try {
    await db.execute(sql`SELECT 1`);
  } catch (error) {
    checks.database = "error";
  }

  try {
    await redisClient.ping();
  } catch {
    checks.redis = "error";
  }

  const allHealthy = Object.values(checks).every((v) => v === "ok");
  return res.status(allHealthy ? 200 : 503).json({ checks });
});

app.use("/api/url", urlRoutes);
app.use("/api/auth", authRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server's live on port ${PORT}`);
});
