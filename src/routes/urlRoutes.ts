import { Router } from "express";
import {
  claimGuestLinks,
  deleteUrl,
  getLinkDetails,
  getMyLinks,
  getPublicStats,
  redirect,
  short,
  updateUrl,
} from "../controllers/urlControllers.js";
import { optionalAuth, validateToken } from "../middleWare/validateToken.js";
import { redirectLimiter, shortLimiter } from "../middleWare/rateLimiter.js";
import { validate } from "../middleWare/validate.js";
import { shortUrlSchema } from "../schemas/urlSchemas.js";

const router = Router();

router.get("/my-links", validateToken, getMyLinks);
router.get("/details/:shortCode", validateToken, getLinkDetails);
router.get("/stats", getPublicStats);
router.put("/claim", validateToken, claimGuestLinks);

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
