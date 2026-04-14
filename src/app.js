import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";

import { apiLimiter, bookingLimiter, contactLimiter } from "./lib/rateLimiters.js";
import { isProd } from "./lib/security.js";

import destinationsRouter from "./routes/destinations.js";
import packagesRouter from "./routes/packages.js";
import contactRouter from "./routes/contact.js";
import bookingRouter from "./routes/booking.js";
import adminRouter from "./routes/admin.js";

const app = express();

app.disable("x-powered-by");

if (process.env.TRUST_PROXY === "true" || process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}

const allowOrigin = (process.env.ALLOW_ORIGIN || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowOrigin.length === 0) {
        if (isProd()) return callback(new Error("CORS not configured"), false);
        return callback(null, true);
      }
      if (allowOrigin.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"), false);
    },
    credentials: allowOrigin.length > 0,
  }),
);

app.use(helmet());
app.use(mongoSanitize());
app.use(hpp());
app.use(express.json({ limit: process.env.JSON_LIMIT || "1mb" }));

app.use("/api/", apiLimiter);
app.use("/api/contact", contactLimiter);
app.use("/api/book-tour", bookingLimiter);

app.use("/api/destinations", destinationsRouter);
app.use("/api/packages", packagesRouter);
app.use("/api/contact", contactRouter);
app.use("/api/book-tour", bookingRouter);
app.use("/api/admin", adminRouter);

app.get("/api/health", (req, res) =>
  res.json({ status: "ok", time: new Date() }),
);

app.use((err, req, res, next) => {
  console.error(err.stack || err);
  const status = err.status || 500;
  const message = isProd() ? "Internal server error" : err.message || "Internal server error";
  res.status(status).json({ message });
});

export default app;
