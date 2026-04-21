import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { isProd } from "./lib/security.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const rawEnv = process.env.APP_ENV || process.env.NODE_ENV || "local";
const appEnv = ["development", "dev"].includes(rawEnv) ? "local" : rawEnv;

const envPath = path.join(rootDir, `.env.${appEnv}`);
const fallbackPath = path.join(rootDir, ".env");

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else if (fs.existsSync(fallbackPath)) {
  dotenv.config({ path: fallbackPath });
} else {
  dotenv.config();
}

if (isProd() && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set in production.");
}

if (process.env.ALLOW_BOOTSTRAP_ADMIN === "true") {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.warn("ADMIN_EMAIL and ADMIN_PASSWORD are required when ALLOW_BOOTSTRAP_ADMIN=true.");
  }
}

const { default: app } = await import("./app.js");
const { connectDb } = await import("./lib/db.js");

const PORT = process.env.PORT || 5000;

connectDb()
  

app.listen(PORT, () => {
  console.log(`Vaigai Tourism API running on http://localhost:${PORT}`);
});
