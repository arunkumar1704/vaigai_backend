const isProd = () =>
  process.env.NODE_ENV === "production" || process.env.APP_ENV === "production";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (isProd()) {
      throw new Error("JWT_SECRET is required in production.");
    }
    console.warn("JWT_SECRET missing. Using an insecure dev fallback.");
    return "dev-insecure-secret";
  }
  return secret;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? ""));

const cleanString = (value, maxLen = 5000) =>
  String(value ?? "")
    .trim()
    .slice(0, maxLen);

export { isProd, getJwtSecret, escapeHtml, isEmail, cleanString };
