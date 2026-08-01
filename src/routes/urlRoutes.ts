import { Router } from "express";
import {
  deleteUrl,
  redirect,
  short,
  updateUrl,
} from "../controllers/urlControllers.js";

const router = Router();

router.post("/short", short);
router.get("/:shortCode", redirect);
router.put("/:shortCode", updateUrl);
router.put("/delete/:id", deleteUrl);

export default router;
