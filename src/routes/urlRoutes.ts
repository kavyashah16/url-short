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

const router = Router();

router.post("/short", optionalAuth, short);
router.get("/:shortCode", redirect);

router.put("/:shortCode", validateToken, updateUrl);
router.put("/delete/:id", validateToken, deleteUrl);
router.post("/login", validateLogin, loginUser);
router.post("/register", validateRegistration, registerUser);

export default router;
