const router = require('express').Router()
const nodemailer = require('nodemailer')
const { Booking } = require('../models')

// ── Helper: create transporter ──────────────────────────────────────────────
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,   // Gmail App Password
    },
  })
}

// ── POST /api/book-tour ─────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const {
    name, phone, email, travelDate, people,
    packageId, packageName, totalAmount, specialRequests
  } = req.body

  if (!name || !phone || !email || !packageId) {
    return res.status(400).json({ message: 'Missing required fields' })
  }

  try {
    // Save to DB
    const booking = await Booking.create({
      packageId, packageName,
      name, phone, email,
      travelDate: travelDate ? new Date(travelDate) : undefined,
      people: Number(people) || 1,
      totalAmount: Number(totalAmount) || 0,
      specialRequests,
      status: 'Pending',
    })

    const formattedDate = travelDate
      ? new Date(travelDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : 'To Be Confirmed'

    const formattedTotal = Number(totalAmount).toLocaleString('en-IN')

    // ── Send emails only if EMAIL_USER is configured ─────────────────────────
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = createTransporter()

      // ── 1. ADMIN email → vaigaitourism@gmail.com ──────────────────────────
      await transporter.sendMail({
        from: `"Vaigai Tourism Bookings" <${process.env.EMAIL_USER}>`,
        to: 'vaigaitourism@gmail.com',
        subject: `🏕️ New Booking #${booking.bookingId} — ${packageName} by ${name}`,
        html: `
          <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:620px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background:linear-gradient(135deg,#F5C400,#FFD84D);padding:32px 36px;text-align:center;">
              <h1 style="margin:0;color:#0A3C45;font-size:26px;font-weight:800;">🌴 Vaigai Tourism</h1>
              <p style="margin:8px 0 0;color:#555;font-size:15px;">New Booking Received</p>
            </div>
            <!-- Body -->
            <div style="padding:36px;">
              <h2 style="color:#F5C400;margin:0 0 20px;font-size:20px;">Booking Details — #${booking.bookingId}</h2>
              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <tr style="border-bottom:1px solid #f5f5f5;">
                  <td style="padding:10px 0;color:#888;width:40%;">👤 Guest Name</td>
                  <td style="padding:10px 0;font-weight:700;color:#222;">${name}</td>
                </tr>
                <tr style="border-bottom:1px solid #f5f5f5;">
                  <td style="padding:10px 0;color:#888;">📧 Email</td>
                  <td style="padding:10px 0;color:#222;">${email}</td>
                </tr>
                <tr style="border-bottom:1px solid #f5f5f5;">
                  <td style="padding:10px 0;color:#888;">📱 Phone</td>
                  <td style="padding:10px 0;color:#222;">${phone}</td>
                </tr>
                <tr style="border-bottom:1px solid #f5f5f5;">
                  <td style="padding:10px 0;color:#888;">🏷️ Package</td>
                  <td style="padding:10px 0;font-weight:700;color:#0A3C45;">${packageName}</td>
                </tr>
                <tr style="border-bottom:1px solid #f5f5f5;">
                  <td style="padding:10px 0;color:#888;">📅 Travel Date</td>
                  <td style="padding:10px 0;color:#222;">${formattedDate}</td>
                </tr>
                <tr style="border-bottom:1px solid #f5f5f5;">
                  <td style="padding:10px 0;color:#888;">👥 People</td>
                  <td style="padding:10px 0;color:#222;">${people} Person(s)</td>
                </tr>
                <tr style="border-bottom:1px solid #f5f5f5;">
                  <td style="padding:10px 0;color:#888;">💰 Total Amount</td>
                  <td style="padding:10px 0;font-weight:700;color:#F5C400;font-size:18px;">₹${formattedTotal}</td>
                </tr>
                ${specialRequests ? `<tr><td style="padding:10px 0;color:#888;vertical-align:top;">📝 Special Requests</td><td style="padding:10px 0;color:#555;">${specialRequests}</td></tr>` : ''}
              </table>
            </div>
            <div style="background:#f9f9f9;padding:18px 36px;text-align:center;color:#aaa;font-size:12px;">
              Raja Mill Road, Simmakal, Madurai – 625001 &nbsp;|&nbsp; +91 8778958663 &nbsp;|&nbsp; vaigaitourism@gmail.com
            </div>
          </div>
        `,
      })

      // ── 2. CUSTOMER confirmation email ────────────────────────────────────
      await transporter.sendMail({
        from: `"Vaigai Tourism" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `✅ Booking Confirmed — ${packageName} | Vaigai Tourism`,
        html: `
          <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:620px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);">
            <div style="background:linear-gradient(135deg,#F5C400,#FFD84D);padding:32px 36px;text-align:center;">
              <h1 style="margin:0;color:#0A3C45;font-size:26px;font-weight:800;">🌴 Vaigai Tourism</h1>
              <p style="margin:8px 0 0;color:#555;font-size:15px;">Booking Confirmed</p>
            </div>
            <div style="padding:36px;">
              <p style="font-size:17px;color:#222;margin:0 0 10px;">Hi <strong>${name}</strong>,</p>
              <p style="color:#666;line-height:1.7;margin:0 0 24px;">
                Thank you for choosing <strong>Vaigai Tourism</strong>! 🎉 Your booking for <strong>${packageName}</strong>
                has been confirmed. Our team will contact you at <strong>${phone}</strong> within 2 hours
                to finalise the trip details.
              </p>

              <div style="background:#fffbea;border-left:4px solid #F5C400;padding:22px 24px;border-radius:10px;margin-bottom:24px;">
                <h3 style="margin:0 0 16px;color:#0A3C45;font-size:16px;">📋 Your Booking Summary</h3>
                <p style="margin:5px 0;color:#555;font-size:14px;">🆔 Booking ID: <strong>${booking.bookingId}</strong></p>
                <p style="margin:5px 0;color:#555;font-size:14px;">🏷️ Package: <strong>${packageName}</strong></p>
                <p style="margin:5px 0;color:#555;font-size:14px;">📅 Travel Date: <strong>${formattedDate}</strong></p>
                <p style="margin:5px 0;color:#555;font-size:14px;">👥 People: <strong>${people}</strong></p>
                <p style="margin:5px 0;color:#555;font-size:14px;">💰 Total: <strong style="color:#F5C400;font-size:18px;">₹${formattedTotal}</strong></p>
              </div>

              <p style="color:#888;font-size:13px;line-height:1.7;">
                📍 <strong>Vaigai Tourism Board</strong><br/>
                Raja Mill Road, Simmakal, Madurai – 625001<br/>
                📞 +91 8778958663 &nbsp;|&nbsp; ✉️ vaigaitourism@gmail.com
              </p>
            </div>
            <div style="background:#f9f9f9;padding:16px 36px;text-align:center;color:#aaa;font-size:11px;">
              © 2025 Vaigai Tourism Board. All rights reserved.
            </div>
          </div>
        `,
      })

      console.log(`✅ Emails sent for booking ${booking.bookingId}`)
    }

    res.status(201).json({ message: 'Booking created', bookingId: booking.bookingId })

  } catch (err) {
    console.error('Booking error:', err)
    res.status(500).json({ message: 'Booking failed. Please try again.' })
  }
})

// ── GET /api/book-tour/:bookingId ────────────────────────────────────────────
router.get('/:bookingId', async (req, res) => {
  try {
    const booking = await Booking.findOne({ bookingId: req.params.bookingId })
    if (!booking) return res.status(404).json({ message: 'Booking not found' })
    res.json(booking)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
