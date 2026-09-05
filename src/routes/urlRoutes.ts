import { Router } from "express";
import {
  deleteUrl,
  redirect,
  short,
  updateUrl,
} from "../controllers/urlControllers.js";
import { loginUser, registerUser } from "../controllers/authControllers.js";
import { validateLogin } from "../middleWare/validateLogin.js";
import { validateRegistration } from "../middleWare/validateRegistration.js";
import { optionalAuth, validateToken } from "../middleWare/validateToken.js";
import {
  authLimiter,
  redirectLimiter,
  shortLimiter,
} from "../middleWare/rateLimiter.js";

const router = Router();

router.post("/short", shortLimiter, optionalAuth, short);
router.get("/:shortCode", redirectLimiter, redirect);

router.put("/:shortCode", validateToken, updateUrl);
router.put("/delete/:id", validateToken, deleteUrl);
router.post("/login", authLimiter, validateLogin, loginUser);
router.post("/register", authLimiter, validateRegistration, registerUser);

export default router;
