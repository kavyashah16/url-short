import { Queue, RedisConnection } from "bullmq";
import { redisConnection } from "../db/redis.js";

export const analyticsQueue = new Queue("analytics", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});
