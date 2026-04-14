import jwt from "jsonwebtoken";
import { getJwtSecret } from "../lib/security.js";

const auth = (req, res, next) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  console.log(header);
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "No token provided" });
  }

  let secret;
  try {
    secret = getJwtSecret();
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  try {
    req.admin = jwt.verify(token, secret);
    console.log("-------555  ", req.admin);
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

export default auth;
