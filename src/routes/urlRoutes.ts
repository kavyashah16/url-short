import { Router } from "express";
import {
  deleteUrl,
  redirect,
  short,
  updateUrl,
} from "../controllers/urlControllers.js";
import { optionalAuth, validateToken } from "../middleWare/validateToken.js";
import { redirectLimiter, shortLimiter } from "../middleWare/rateLimiter.js";
import { validate } from "../middleWare/validate.js";
import { shortUrlSchema } from "../schemas/urlSchemas.js";

const router = Router();

router.post(
  "/short",
  shortLimiter,
  optionalAuth,
  validate(shortUrlSchema),
  short,
);
router.get("/:shortCode", redirectLimiter, redirect);

router.put("/:shortCode", validateToken, updateUrl);
router.put("/delete/:id", validateToken, deleteUrl);

export default router;
