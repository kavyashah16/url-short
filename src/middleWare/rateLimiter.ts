import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { redisClient } from "../db/redis.js";

function makeRedisStore(prefix: string) {
  return new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    prefix: `rl${prefix}`,
  });
}

export const shortLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRedisStore("short"),
  message: {
    message: "Too many links created. Please slow down and try again shortly.",
  },
});

export const redirectLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRedisStore("redirect"),
  message: { message: "Too many requests. Please try again shortly." },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRedisStore("auth"),
  message: { message: "Too many attempts. Please try again in 15 minutes." },
});
