import { Message } from "../models/index.js";
import { createTransporter } from "../lib/mailer.js";
import { cleanString, escapeHtml, isEmail, isProd } from "../lib/security.js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "vaigaitourism@gmail.com";

const createContactMessage = async (req, res) => {
  const name = cleanString(req.body?.name, 120);
  const email = cleanString(req.body?.email, 200).toLowerCase();
  const phone = cleanString(req.body?.phone, 30);
  const message = cleanString(req.body?.message, 2000);

  if (!name || !email || !message || !isEmail(email)) {
    return res.status(400).json({ message: "Missing or invalid fields" });
  }

  try {
    const msg = await Message.create({ name, email, phone, message, isRead: false });

    const mailUser = process.env.SMTP_USER || process.env.EMAIL_USER;
    const mailPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

    if (mailUser && mailPass) {
      const transporter = createTransporter();

      const safeName = escapeHtml(name);
      const safeEmail = escapeHtml(email);
      const safePhone = escapeHtml(phone || "Not provided");
      const safeMessage = escapeHtml(message);

      await transporter.sendMail({
        from: `"Vaigai Tourism Website" <${mailUser}>`,
        to: ADMIN_EMAIL,
        replyTo: email,
        subject: `New Contact Message from ${name}`,
        html: `
          <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.10);">
            <div style="background:linear-gradient(135deg,#F5C400,#FFD84D);padding:28px 32px;text-align:center;">
              <h1 style="margin:0;color:#0A3C45;font-size:22px;font-weight:800;">Vaigai Tourism</h1>
              <p style="margin:6px 0 0;color:#555;font-size:13px;">New Website Contact Message</p>
            </div>
            <div style="padding:30px 32px;">
              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <tr style="border-bottom:1px solid #f5f5f5;">
                  <td style="padding:10px 0;color:#888;width:35%;">Name</td>
                  <td style="padding:10px 0;font-weight:700;color:#222;">${safeName}</td>
                </tr>
                <tr style="border-bottom:1px solid #f5f5f5;">
                  <td style="padding:10px 0;color:#888;">Email</td>
                  <td style="padding:10px 0;"><a href="mailto:${safeEmail}" style="color:#0A3C45;">${safeEmail}</a></td>
                </tr>
                <tr style="border-bottom:1px solid #f5f5f5;">
                  <td style="padding:10px 0;color:#888;">Phone</td>
                  <td style="padding:10px 0;color:#222;">${safePhone}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;color:#888;vertical-align:top;">Message</td>
                  <td style="padding:10px 0;color:#444;line-height:1.7;">${safeMessage}</td>
                </tr>
              </table>
            </div>
            <div style="background:#f9f9f9;padding:14px 32px;text-align:center;color:#bbb;font-size:11px;">
              Raja Mill Road, Simmakal, Madurai - 625001 &nbsp;|&nbsp; +91 8778958663
            </div>
          </div>
        `,
      });

      await transporter.sendMail({
        from: `"Vaigai Tourism" <${mailUser}>`,
        to: email,
        subject: "We received your message - Vaigai Tourism",
        html: `
          <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.10);">
            <div style="background:linear-gradient(135deg,#F5C400,#FFD84D);padding:28px 32px;text-align:center;">
              <h1 style="margin:0;color:#0A3C45;font-size:22px;font-weight:800;">Vaigai Tourism</h1>
              <p style="margin:6px 0 0;color:#555;font-size:13px;">We've received your message</p>
            </div>
            <div style="padding:32px;">
              <p style="font-size:16px;color:#222;margin:0 0 12px;">Hi <strong>${safeName}</strong>,</p>
              <p style="color:#666;line-height:1.8;margin:0 0 20px;">
                Thank you for reaching out to <strong>Vaigai Tourism</strong>!
                We have received your message and our team will get back to you
                within <strong>24 hours</strong>.
              </p>
              <div style="background:#fffbea;border-left:4px solid #F5C400;padding:18px 20px;border-radius:10px;margin-bottom:24px;">
                <p style="margin:0 0 8px;font-size:13px;color:#888;">Your message:</p>
                <p style="margin:0;font-size:14px;color:#444;line-height:1.7;font-style:italic;">"${safeMessage}"</p>
              </div>
              <p style="color:#888;font-size:13px;line-height:1.7;">
                For urgent queries, reach us directly:<br/>
                Phone: <a href="tel:+918778958663" style="color:#0A3C45;">+91 8778958663</a><br/>
                WhatsApp: <a href="https://wa.me/918778958663" style="color:#0A3C45;">+91 8778958663</a><br/>
                Address: Raja Mill Road, Simmakal, Madurai - 625001
              </p>
            </div>
            <div style="background:#f9f9f9;padding:14px 32px;text-align:center;color:#bbb;font-size:11px;">
              (c) 2025 Vaigai Tourism Board. All rights reserved.
            </div>
          </div>
        `,
      });
    }

    res.status(201).json({ message: "Message sent successfully", id: msg._id });
  } catch (err) {
    console.error("Contact error:", err);
    res
      .status(500)
      .json({ message: isProd() ? "Failed to send message" : "Failed to send message. Please try again." });
  }
};

export { createContactMessage };
