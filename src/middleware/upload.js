import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, "..", "..", "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_, __, callback) => {
    callback(null, uploadsDir);
  },
  filename: (_, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const safeExtension = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"].includes(extension)
      ? extension
      : ".jpg";
    callback(null, `pkg-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExtension}`);
  },
});

const fileFilter = (_, file, callback) => {
  if (!file.mimetype?.startsWith("image/")) {
    callback(new Error("Only image files are allowed"), false);
    return;
  }
  callback(null, true);
};

const uploadSingleImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("image");

export { uploadSingleImage };
