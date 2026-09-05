import { Worker } from "bullmq";
import { db } from "../db/index.js";
import { analytics } from "../db/schema.js";
import { redirect } from "../controllers/urlControllers.js";
import { redisConnection } from "../db/redis.js";

const worker = new Worker(
  "analytics",
  async (job) => {
    const { urlId, country, ipAddress, browser, device, referrer } = job.data;

    await db.insert(analytics).values({
      urlId,
      ipAddress,
      country,
      browser,
      device,
      referrer,
    });
  },
  { connection: redisConnection, concurrency: 5 },
);

worker.on("completed", (job) => {
  console.log(`Analytics job ${job.id} recorded (urlId: ${job.data.urlId})`);
});

worker.on("failed", (job, err) => {
  console.error(`Analytics job ${job?.id} failed after retries:`, err.message);
});

console.log("Analytics worker started, waiting for jobs...");
