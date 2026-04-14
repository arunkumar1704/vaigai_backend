import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Admin, Package, Booking, Message } from "../models/index.js";
import { cleanString, getJwtSecret, isEmail, isProd } from "../lib/security.js";
import { comparePassword, hashPassword } from "../lib/bcrypt.js";

const pickPackageFields = (data) => {
  const allowed = [
    "name",
    "subtitle",
    "duration",
    "price",
    "originalPrice",
    "image",
    "destination",
    "category",
    "highlights",
    "includes",
    "badge",
    "rating",
    "reviews",
    "active",
  ];

  const pkg = {};
  for (const key of allowed) {
    if (data[key] === undefined) continue;
    if (key === "highlights" || key === "includes") {
      if (Array.isArray(data[key])) {
        pkg[key] = data[key]
          .map((item) => cleanString(item, 200))
          .filter(Boolean);
      } else if (typeof data[key] === "string") {
        pkg[key] = data[key]
          .split(",")
          .map((item) => cleanString(item, 200))
          .filter(Boolean);
      }
      continue;
    }
    if (typeof data[key] === "string") {
      pkg[key] = cleanString(data[key], 500);
      continue;
    }
    pkg[key] = data[key];
  }
  return pkg;
};

export const adminLogin = async (req, res) => {
  try {
    console.log("----------", req.body);
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }
    // const hashed = await hashPassword(password);
    // console.log("--- : ", hashed);
    const adminData = await Admin.findOne({ email: email.toLowerCase() });
    if (!adminData) {
      return res.status(500).json({
        success: false,
        errors: { email: "Invalid email" },
      });
    }

    const isPasswordMatch = await comparePassword(password, adminData.password);

    if (!isPasswordMatch) {
      return res.status(500).json({
        success: false,
        errors: { password: "Invalid password" },
      });
    }

    const token = jwt.sign(
      {
        id: adminData._id,
        email: adminData.email,
        role: adminData.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );
    res.cookie("adminToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
    });
    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

export const CheckAdmin = async (req, res) => {
  try {
    // const hashed = await hashPassword(password);
    // console.log("--- : ", hashed);
    const adminData = await Admin.findById(req.admin.id);
    if (!adminData) {
      return res.status(500).json({
        success: false,
        errors: "unauthorized",
      });
    }

    return res.status(200).json({
      success: true,
      message: "welcome admin",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

const getStats = async (req, res) => {
  try {
    const [packages, bookings, messages, revenue] = await Promise.all([
      Package.countDocuments({ active: true }),
      Booking.countDocuments(),
      Message.countDocuments({ read: false }),
      Booking.aggregate([
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
    ]);
    res.json({
      packages,
      bookings,
      unreadMessages: messages,
      revenue: revenue[0]?.total || 0,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: isProd() ? "Failed to load stats" : err.message });
  }
};

const listPackages = async (req, res) => {
  res.json(await Package.find().sort("-createdAt"));
};

const createPackage = async (req, res) => {
  try {
    const payload = pickPackageFields(req.body || {});
    if (!payload.name || !payload.duration || payload.price === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const pkg = await Package.create(payload);
    res.status(201).json(pkg);
  } catch (err) {
    res
      .status(400)
      .json({ message: isProd() ? "Invalid package" : err.message });
  }
};

const updatePackage = async (req, res) => {
  try {
    const payload = pickPackageFields(req.body || {});
    const pkg = await Package.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });
    if (!pkg) return res.status(404).json({ message: "Not found" });
    res.json(pkg);
  } catch (err) {
    res
      .status(400)
      .json({ message: isProd() ? "Invalid update" : err.message });
  }
};

const deletePackage = async (req, res) => {
  try {
    await Package.findByIdAndDelete(req.params.id);
    res.json({ message: "Package deleted" });
  } catch (err) {
    res.status(500).json({ message: isProd() ? "Delete failed" : err.message });
  }
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toCsvValue = (value) => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const listBookings = async (req, res) => {
  try {
    const filter = {};
    const bookingId = cleanString(req.query?.bookingId, 100);
    const name = cleanString(req.query?.name, 200);
    const email = cleanString(req.query?.email, 200).toLowerCase();
    const phone = cleanString(req.query?.phone, 50);
    const packageName = cleanString(req.query?.packageName, 200);
    const status = cleanString(req.query?.status, 50);
    const fromDate = cleanString(req.query?.fromDate, 50);
    const toDate = cleanString(req.query?.toDate, 50);

    if (bookingId) filter.bookingId = new RegExp(escapeRegex(bookingId), "i");
    if (name) filter.name = new RegExp(escapeRegex(name), "i");
    if (email) filter.email = new RegExp(escapeRegex(email), "i");
    if (phone) filter.phone = new RegExp(escapeRegex(phone), "i");
    if (packageName)
      filter.packageName = new RegExp(escapeRegex(packageName), "i");

    if (status && status !== "all") {
      const allowed = new Set(["Pending", "Confirmed", "Cancelled"]);
      if (!allowed.has(status)) {
        return res.status(400).json({ message: "Invalid status filter" });
      }
      filter.status = status;
    }

    if (fromDate || toDate) {
      const range = {};
      if (fromDate) {
        const parsed = new Date(fromDate);
        if (!Number.isNaN(parsed.getTime())) range.$gte = parsed;
      }
      if (toDate) {
        const parsed = new Date(toDate);
        if (!Number.isNaN(parsed.getTime())) range.$lte = parsed;
      }
      if (Object.keys(range).length) {
        filter.travelDate = range;
      }
    }

    const exportType = cleanString(req.query?.export, 20).toLowerCase();
    if (exportType === "csv") {
      const items = await Booking.find(filter).sort("-createdAt");
      const header = [
        "bookingId",
        "name",
        "email",
        "phone",
        "packageName",
        "travelDate",
        "people",
        "totalAmount",
        "status",
        "paymentStatus",
        "createdAt",
      ];
      const rows = items.map((booking) => [
        booking.bookingId,
        booking.name,
        booking.email,
        booking.phone,
        booking.packageName,
        booking.travelDate ? new Date(booking.travelDate).toISOString() : "",
        booking.people ?? "",
        booking.totalAmount ?? "",
        booking.status,
        booking.paymentStatus,
        booking.createdAt ? new Date(booking.createdAt).toISOString() : "",
      ]);
      const csv = [header, ...rows]
        .map((row) => row.map(toCsvValue).join(","))
        .join("\n");
      const fileName = `vaigai-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      return res.status(200).send(csv);
    }

    const pageRaw = Number.parseInt(req.query?.page, 10);
    const limitRaw = Number.parseInt(req.query?.limit, 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 10;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Booking.find(filter).sort("-createdAt").skip(skip).limit(limit),
      Booking.countDocuments(filter),
    ]);

    res.json({
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: isProd() ? "Failed to load bookings" : err.message });
  }
};

const updateBookingStatus = async (req, res) => {
  try {
    const allowed = new Set(["Pending", "Confirmed", "Cancelled"]);
    const status = cleanString(req.body?.status, 50);
    if (!allowed.has(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true },
    );
    res.json(booking);
  } catch (err) {
    res
      .status(400)
      .json({ message: isProd() ? "Invalid update" : err.message });
  }
};

const listMessages = async (req, res) => {
  res.json(await Message.find().sort("-createdAt"));
};

const markMessageRead = async (req, res) => {
  await Message.findByIdAndUpdate(req.params.id, { read: true });
  res.json({ success: true });
};

export {
  getStats,
  listPackages,
  createPackage,
  updatePackage,
  deletePackage,
  listBookings,
  updateBookingStatus,
  listMessages,
  markMessageRead,
};
