import { Subscription } from "../models/index.js";
import { cleanString, isEmail, isProd } from "../lib/security.js";

const subscribeNewsletter = async (req, res) => {
  const email = cleanString(req.body?.email, 200).toLowerCase();

  if (!email || !isEmail(email)) {
    return res.status(400).json({ message: "Valid email is required" });
  }

  try {
    const existing = await Subscription.findOne({ email });
    if (existing) {
      return res.status(200).json({ message: "Already subscribed" });
    }

    await Subscription.create({ email, isRead: false });
    res.status(201).json({ message: "Subscribed successfully" });
  } catch (err) {
    res.status(500).json({ message: isProd() ? "Subscription failed" : err.message });
  }
};

export { subscribeNewsletter };
