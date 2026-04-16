import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Admin, Package, Booking, Message, Subscription, SiteSettings } from "../models/index.js";
import { cleanString, getJwtSecret, isEmail, isProd } from "../lib/security.js";
import { comparePassword, hashPassword } from "../lib/bcrypt.js";
import { normalizeSiteSettings } from "./siteSettingsController.js";

const unreadMessageFilter = {
  $or: [
    { isRead: false },
    { isRead: { $exists: false }, read: false },
    { isRead: { $exists: false }, read: { $exists: false } },
  ],
};

const unreadBookingFilter = {
  $or: [
    { isRead: false },
    { isRead: { $exists: false }, read: false },
    { isRead: { $exists: false }, read: { $exists: false } },
  ],
};

const unreadSubscriptionFilter = {
  $or: [
    { isRead: false },
    { isRead: { $exists: false }, read: false },
    { isRead: { $exists: false }, read: { $exists: false } },
  ],
};

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

const pickSiteSettingsFields = (data) => {
  const socialLinks = data?.socialLinks || {};

  return {
    logo: cleanString(data?.logo, 500),
    address: cleanString(data?.address, 500),
    phone: cleanString(data?.phone, 50),
    email: cleanString(data?.email, 200).toLowerCase(),
    socialLinks: {
      facebook: cleanString(socialLinks.facebook, 500),
      instagram: cleanString(socialLinks.instagram, 500),
      twitter: cleanString(socialLinks.twitter, 500),
      youtube: cleanString(socialLinks.youtube, 500),
      whatsapp: cleanString(socialLinks.whatsapp, 500),
    },
  };
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
    const [packages, bookings, unreadBookings, messages, unreadSubscriptions, revenue] = await Promise.all([
      Package.countDocuments({ active: true }),
      Booking.countDocuments(),
      Booking.countDocuments(unreadBookingFilter),
      Message.countDocuments(unreadMessageFilter),
      Subscription.countDocuments(unreadSubscriptionFilter),
      Booking.aggregate([
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
    ]);
    res.json({
      packages,
      bookings,
      unreadBookings,
      unreadMessages: messages,
      unreadSubscriptions,
      revenue: revenue[0]?.total || 0,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: isProd() ? "Failed to load stats" : err.message });
  }
};

const listPackages = async (req, res) => {
  try {
    const filter = {};
    const q = cleanString(req.query?.q, 200);
    const category = cleanString(req.query?.category, 100);
    const active = cleanString(req.query?.active, 10).toLowerCase();

    if (q) {
      const pattern = new RegExp(escapeRegex(q), "i");
      filter.$or = [
        { name: pattern },
        { destination: pattern },
        { subtitle: pattern },
        { badge: pattern },
      ];
    }

    if (category && category !== "all") {
      filter.category = category;
    }

    if (active === "true") filter.active = true;
    if (active === "false") filter.active = false;

    const pageRaw = Number.parseInt(req.query?.page, 10);
    const limitRaw = Number.parseInt(req.query?.limit, 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Package.find(filter).sort("-createdAt").skip(skip).limit(limit),
      Package.countDocuments(filter),
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
      .json({ message: isProd() ? "Failed to load packages" : err.message });
  }
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

const uploadPackageImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Image file is required" });
  }

  return res.status(201).json({
    message: "Image uploaded",
    image: `/uploads/${req.file.filename}`,
  });
};

const getSiteSettings = async (req, res) => {
  try {
    const settings = await SiteSettings.findOne().sort("-updatedAt").lean();
    res.json(normalizeSiteSettings(settings));
  } catch (err) {
    res
      .status(500)
      .json({ message: isProd() ? "Failed to load site settings" : err.message });
  }
};

const updateSiteSettings = async (req, res) => {
  try {
    const payload = pickSiteSettingsFields(req.body || {});
    if (!payload.address || !payload.phone || !payload.email) {
      return res.status(400).json({ message: "Address, phone and email are required" });
    }
    if (!isEmail(payload.email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    const existing = await SiteSettings.findOne().sort("-updatedAt");
    let settings;

    if (existing) {
      existing.logo = payload.logo;
      existing.address = payload.address;
      existing.phone = payload.phone;
      existing.email = payload.email;
      existing.socialLinks = payload.socialLinks;
      settings = await existing.save();
    } else {
      settings = await SiteSettings.create(payload);
    }

    res.json(normalizeSiteSettings(settings.toObject()));
  } catch (err) {
    res
      .status(400)
      .json({ message: isProd() ? "Failed to update site settings" : err.message });
  }
};

const uploadSiteSettingsLogo = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Image file is required" });
  }

  return res.status(201).json({
    message: "Logo uploaded",
    image: `/uploads/${req.file.filename}`,
  });
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
      const items = await Booking.find(filter).sort("-createdAt").lean();
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
        "isRead",
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
        Boolean(booking.isRead ?? booking.read ?? false),
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
      Booking.find(filter).sort("-createdAt").skip(skip).limit(limit).lean(),
      Booking.countDocuments(filter),
    ]);

    res.json({
      items: items.map((booking) => ({
        ...booking,
        isRead: Boolean(booking.isRead ?? booking.read ?? false),
      })),
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

const markBookingRead = async (req, res) => {
  const booking = await Booking.findByIdAndUpdate(
    req.params.id,
    { isRead: true, read: true },
    { new: true },
  ).lean();

  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }

  res.json({
    success: true,
    item: {
      ...booking,
      isRead: true,
    },
  });
};

const markBookingsRead = async (req, res) => {
  const ids = Array.isArray(req.body?.ids)
    ? req.body.ids
        .map((value) => cleanString(value, 100))
        .filter(Boolean)
    : [];

  if (ids.length === 0) {
    return res.status(400).json({ message: "Booking ids are required" });
  }

  await Booking.updateMany(
    { _id: { $in: ids } },
    { $set: { isRead: true, read: true } },
  );

  res.json({
    success: true,
    updatedIds: ids,
  });
};

const listSubscriptions = async (req, res) => {
  try {
    const filter = {};
    const email = cleanString(req.query?.email, 200).toLowerCase();
    const status = cleanString(req.query?.status, 20).toLowerCase();

    if (email) filter.email = new RegExp(escapeRegex(email), "i");
    if (status === "read") filter.isRead = true;
    if (status === "unread") filter.$or = unreadSubscriptionFilter.$or;

    const pageRaw = Number.parseInt(req.query?.page, 10);
    const limitRaw = Number.parseInt(req.query?.limit, 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 10;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Subscription.find(filter).sort("-createdAt").skip(skip).limit(limit).lean(),
      Subscription.countDocuments(filter),
    ]);

    res.json({
      items: items.map((item) => ({
        ...item,
        isRead: Boolean(item.isRead ?? item.read ?? false),
      })),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: isProd() ? "Failed to load subscriptions" : err.message });
  }
};

const markSubscriptionRead = async (req, res) => {
  const subscription = await Subscription.findByIdAndUpdate(
    req.params.id,
    { isRead: true, read: true },
    { new: true },
  ).lean();

  if (!subscription) {
    return res.status(404).json({ message: "Subscription not found" });
  }

  res.json({
    success: true,
    item: {
      ...subscription,
      isRead: true,
    },
  });
};

const listMessages = async (req, res) => {
  const messages = await Message.find().sort("-createdAt").lean();
  res.json(
    messages.map((message) => ({
      ...message,
      isRead: Boolean(message.isRead ?? message.read ?? false),
    })),
  );
};

const markMessageRead = async (req, res) => {
  const message = await Message.findByIdAndUpdate(
    req.params.id,
    { isRead: true, read: true },
    { new: true },
  ).lean();

  if (!message) {
    return res.status(404).json({ message: "Message not found" });
  }

  res.json({
    success: true,
    item: {
      ...message,
      isRead: true,
    },
  });
};

export {
  getStats,
  listPackages,
  createPackage,
  updatePackage,
  deletePackage,
  uploadPackageImage,
  getSiteSettings,
  updateSiteSettings,
  uploadSiteSettingsLogo,
  listBookings,
  updateBookingStatus,
  markBookingRead,
  markBookingsRead,
  listSubscriptions,
  markSubscriptionRead,
  listMessages,
  markMessageRead,
};
