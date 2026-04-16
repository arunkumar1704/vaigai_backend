import { Router } from "express";
import { getPublicSiteSettings } from "../controllers/siteSettingsController.js";

const router = Router();

router.get("/", getPublicSiteSettings);

export default router;
