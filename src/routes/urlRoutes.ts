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

const router = Router();

router.post("/short", short);
router.get("/:shortCode", redirect);
router.put("/:shortCode", updateUrl);
router.put("/delete/:id", deleteUrl);
router.post("/login", validateLogin, loginUser);
router.post("/register", validateRegistration, registerUser);

export default router;
