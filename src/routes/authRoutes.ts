import { Router } from "express";
import {
  getMe,
  loginUser,
  registerUser,
} from "../controllers/authControllers.js";
import { authLimiter } from "../middleWare/rateLimiter.js";
import { validate } from "../middleWare/validate.js";
import { loginSchema, registrationSchema } from "../schemas/authSchemas.js";
import { validateToken } from "../middleWare/validateToken.js";

const router = Router();

router.post("/login", authLimiter, validate(loginSchema), loginUser);
router.post(
  "/register",
  authLimiter,
  validate(registrationSchema),
  registerUser,
);
router.get("/me", validateToken, getMe);

export default router;
