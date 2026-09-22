import { createClient } from "redis";

export const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

export const redisConnection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
  tls: process.env.REDIS_TLS === "true" ? {} : undefined,
};

redisClient.on("error", (err) => console.error("Redis Client Error: ", err));

await redisClient.connect();
