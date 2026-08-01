import { Router } from "express";
import { redirect, short, updateUrl } from "../controllers/urlControllers.js";

const router = Router();

router.post("/short", short);
router.get("/:shortCode", redirect);
router.put("/:shortCode", updateUrl);

export default router;
