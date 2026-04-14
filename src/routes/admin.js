import { Router } from "express";
import auth from "../middleware/auth.js";
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
  listMessages,
  markMessageRead,
  CheckAdmin,
} from "../controllers/adminController.js";

const router = Router();

router.post("/login", adminLoginLimiter, adminLogin);
router.get("/is-admin", auth, CheckAdmin);

router.get("/stats", auth, getStats);

router.get("/packages", auth, listPackages);
router.post("/packages", auth, createPackage);
router.put("/packages/:id", auth, updatePackage);
router.delete("/packages/:id", auth, deletePackage);

router.get("/bookings", auth, listBookings);
router.patch("/bookings/:id/status", auth, updateBookingStatus);

router.get("/messages", auth, listMessages);
router.patch("/messages/:id/read", auth, markMessageRead);

export default router;
