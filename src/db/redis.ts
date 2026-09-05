import { createClient } from "redis";

export const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => console.error("Redis Client Error: ", err));

let connected = false;

export async function getRedisClient() {
  if (!connected) {
    await redisClient.connect();
    connected = true;
  }
  return redisClient;
}
