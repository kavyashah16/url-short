import { Router } from "express";
import { redirect, short } from "../controllers/urlControllers.js";

const router = Router();

router.post("/short", short);
router.get("/:shortCode", redirect);

export default router;
