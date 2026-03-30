const router = require('express').Router()
const nodemailer = require('nodemailer')
const { Message } = require('../models')

const ADMIN_EMAIL = 'vaigaitourism@gmail.com'

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })

// POST /api/contact
router.post('/', async (req, res) => {
  const { name, email, phone, message } = req.body
  if (!name || !email || !message)
    return res.status(400).json({ message: 'Missing required fields' })

  try {
    // Save to DB
    const msg = await Message.create({ name, email, phone, message })

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = createTransporter()

      // ── 1. Notify admin ─────────────────────────────────────────────────────
      await transporter.sendMail({
        from: `"Vaigai Tourism Website" <${process.env.EMAIL_USER}>`,
        to: ADMIN_EMAIL,
        replyTo: email,
        subject: `📬 New Contact Message from ${name}`,
        html: `
          <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.10);">
            <div style="background:linear-gradient(135deg,#F5C400,#FFD84D);padding:28px 32px;text-align:center;">
              <h1 style="margin:0;color:#0A3C45;font-size:22px;font-weight:800;">🌴 Vaigai Tourism</h1>
              <p style="margin:6px 0 0;color:#555;font-size:13px;">New Website Contact Message</p>
            </div>
            <div style="padding:30px 32px;">
              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <tr style="border-bottom:1px solid #f5f5f5;">
                  <td style="padding:10px 0;color:#888;width:35%;">👤 Name</td>
                  <td style="padding:10px 0;font-weight:700;color:#222;">${name}</td>
                </tr>
                <tr style="border-bottom:1px solid #f5f5f5;">
                  <td style="padding:10px 0;color:#888;">📧 Email</td>
                  <td style="padding:10px 0;"><a href="mailto:${email}" style="color:#0A3C45;">${email}</a></td>
                </tr>
                <tr style="border-bottom:1px solid #f5f5f5;">
                  <td style="padding:10px 0;color:#888;">📱 Phone</td>
                  <td style="padding:10px 0;color:#222;">${phone || 'Not provided'}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;color:#888;vertical-align:top;">💬 Message</td>
                  <td style="padding:10px 0;color:#444;line-height:1.7;">${message}</td>
                </tr>
              </table>
            </div>
            <div style="background:#f9f9f9;padding:14px 32px;text-align:center;color:#bbb;font-size:11px;">
              Raja Mill Road, Simmakal, Madurai – 625001 &nbsp;|&nbsp; +91 8778958663
            </div>
          </div>
        `,
      })

      // ── 2. Auto-reply to sender ──────────────────────────────────────────────
      await transporter.sendMail({
        from: `"Vaigai Tourism" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `✅ We received your message — Vaigai Tourism`,
        html: `
          <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.10);">
            <div style="background:linear-gradient(135deg,#F5C400,#FFD84D);padding:28px 32px;text-align:center;">
              <h1 style="margin:0;color:#0A3C45;font-size:22px;font-weight:800;">🌴 Vaigai Tourism</h1>
              <p style="margin:6px 0 0;color:#555;font-size:13px;">We've received your message</p>
            </div>
            <div style="padding:32px;">
              <p style="font-size:16px;color:#222;margin:0 0 12px;">Hi <strong>${name}</strong>,</p>
              <p style="color:#666;line-height:1.8;margin:0 0 20px;">
                Thank you for reaching out to <strong>Vaigai Tourism</strong>! 🙏
                We have received your message and our team will get back to you
                within <strong>24 hours</strong>.
              </p>
              <div style="background:#fffbea;border-left:4px solid #F5C400;padding:18px 20px;border-radius:10px;margin-bottom:24px;">
                <p style="margin:0 0 8px;font-size:13px;color:#888;">Your message:</p>
                <p style="margin:0;font-size:14px;color:#444;line-height:1.7;font-style:italic;">"${message}"</p>
              </div>
              <p style="color:#888;font-size:13px;line-height:1.7;">
                For urgent queries, reach us directly:<br/>
                📞 <a href="tel:+918778958663" style="color:#0A3C45;">+91 8778958663</a><br/>
                💬 <a href="https://wa.me/918778958663" style="color:#0A3C45;">WhatsApp us</a><br/>
                📍 Raja Mill Road, Simmakal, Madurai – 625001
              </p>
            </div>
            <div style="background:#f9f9f9;padding:14px 32px;text-align:center;color:#bbb;font-size:11px;">
              © 2025 Vaigai Tourism Board. All rights reserved.
            </div>
          </div>
        `,
      })

      console.log(`✅ Contact emails sent for ${name} (${email})`)
    }

    res.status(201).json({ message: 'Message sent successfully', id: msg._id })
  } catch (err) {
    console.error('Contact error:', err)
    res.status(500).json({ message: 'Failed to send message. Please try again.' })
  }
})

module.exports = router
