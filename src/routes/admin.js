import { Router } from "express";
import auth from "../middleware/auth.js";
import { uploadSingleImage } from "../middleware/upload.js";
import { adminLoginLimiter } from "../lib/rateLimiters.js";
import {
  adminLogin,
  getStats,
  listPackages,
  createPackage,
  updatePackage,
  deletePackage,
  listBookings,
  updateBookingStatus,
  markBookingRead,
  markBookingsRead,
  listSubscriptions,
  markSubscriptionRead,
  getSiteSettings,
  updateSiteSettings,
  uploadSiteSettingsLogo,
  listMessages,
  markMessageRead,
  CheckAdmin,
  uploadPackageImage,
} from "../controllers/adminController.js";

const router = Router();

router.post("/login", adminLoginLimiter, adminLogin);
router.get("/is-admin", auth, CheckAdmin);

router.get("/stats", auth, getStats);

router.get("/site-settings", auth, getSiteSettings);
router.put("/site-settings", auth, updateSiteSettings);
router.post("/site-settings/upload-logo", auth, uploadSingleImage, uploadSiteSettingsLogo);

router.get("/packages", auth, listPackages);
router.post("/packages/upload-image", auth, uploadSingleImage, uploadPackageImage);
router.post("/packages", auth, createPackage);
router.put("/packages/:id", auth, updatePackage);
router.delete("/packages/:id", auth, deletePackage);

router.get("/bookings", auth, listBookings);
router.patch("/bookings/read", auth, markBookingsRead);
router.patch("/bookings/:id/read", auth, markBookingRead);
router.patch("/bookings/:id/status", auth, updateBookingStatus);

router.get("/subscriptions", auth, listSubscriptions);
router.patch("/subscriptions/:id/read", auth, markSubscriptionRead);

router.get("/messages", auth, listMessages);
router.patch("/messages/:id/read", auth, markMessageRead);

export default router;
