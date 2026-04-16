import { Booking } from "../models/index.js";
import { createTransporter } from "../lib/mailer.js";
import { cleanString, escapeHtml, isEmail, isProd } from "../lib/security.js";

const createBooking = async (req, res) => {
  const name = cleanString(req.body?.name, 120);
  const phone = cleanString(req.body?.phone, 30);
  const email = cleanString(req.body?.email, 200).toLowerCase();
  const travelDate = cleanString(req.body?.travelDate, 50);
  const peopleRaw = req.body?.people;
  const packageId = cleanString(req.body?.packageId, 100);
  const packageName = cleanString(req.body?.packageName, 200);
  const totalAmountRaw = req.body?.totalAmount;
  const specialRequests = cleanString(req.body?.specialRequests, 1000);

  if (!name || !phone || !email || !packageId || !isEmail(email)) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const people = Math.min(Math.max(parseInt(peopleRaw, 10) || 1, 1), 50);
  const totalAmount = Math.max(Number(totalAmountRaw) || 0, 0);
  const travelDateValue = travelDate ? new Date(travelDate) : undefined;

  try {
    const booking = await Booking.create({
      packageId,
      packageName,
      name,
      phone,
      email,
      travelDate: travelDateValue,
      people,
      totalAmount,
      specialRequests,
      status: "Pending",
      isRead: false,
    });

    const formattedDate = travelDateValue
      ? travelDateValue.toLocaleDateString("en-IN", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "To Be Confirmed";

    const formattedTotal = Number(totalAmount).toLocaleString("en-IN");

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = createTransporter();

      const safeName = escapeHtml(name);
      const safeEmail = escapeHtml(email);
      const safePhone = escapeHtml(phone);
      const safePackageName = escapeHtml(packageName || "Package");
      const safeSpecial = escapeHtml(specialRequests);

      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: `New Booking #${booking.bookingId} - ${packageName} by ${name}`,
        html: `
          <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:620px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);">
            <div style="background:linear-gradient(135deg,#F5C400,#FFD84D);padding:32px 36px;text-align:center;">
              <h1 style="margin:0;color:#0A3C45;font-size:26px;font-weight:800;">Vaigai Tourism</h1>
              <p style="margin:8px 0 0;color:#555;font-size:15px;">New Booking Received</p>
            </div>
            <div style="padding:36px;">
              <h2 style="color:#F5C400;margin:0 0 20px;font-size:20px;">Booking Details - #${booking.bookingId}</h2>
              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <tr style="border-bottom:1px solid #f5f5f5;">
                  <td style="padding:10px 0;color:#888;width:40%;">Guest Name</td>
                  <td style="padding:10px 0;font-weight:700;color:#222;">${safeName}</td>
                </tr>
                <tr style="border-bottom:1px solid #f5f5f5;">
                  <td style="padding:10px 0;color:#888;">Email</td>
                  <td style="padding:10px 0;color:#222;">${safeEmail}</td>
                </tr>
                <tr style="border-bottom:1px solid #f5f5f5;">
                  <td style="padding:10px 0;color:#888;">Phone</td>
                  <td style="padding:10px 0;color:#222;">${safePhone}</td>
                </tr>
                <tr style="border-bottom:1px solid #f5f5f5;">
                  <td style="padding:10px 0;color:#888;">Package</td>
                  <td style="padding:10px 0;font-weight:700;color:#0A3C45;">${safePackageName}</td>
                </tr>
                <tr style="border-bottom:1px solid #f5f5f5;">
                  <td style="padding:10px 0;color:#888;">Travel Date</td>
                  <td style="padding:10px 0;color:#222;">${formattedDate}</td>
                </tr>
                <tr style="border-bottom:1px solid #f5f5f5;">
                  <td style="padding:10px 0;color:#888;">People</td>
                  <td style="padding:10px 0;color:#222;">${people} Person(s)</td>
                </tr>
                <tr style="border-bottom:1px solid #f5f5f5;">
                  <td style="padding:10px 0;color:#888;">Total Amount</td>
                  <td style="padding:10px 0;font-weight:700;color:#F5C400;font-size:18px;">INR ${formattedTotal}</td>
                </tr>
                ${specialRequests ? `<tr><td style="padding:10px 0;color:#888;vertical-align:top;">Special Requests</td><td style="padding:10px 0;color:#555;">${safeSpecial}</td></tr>` : ""}
              </table>
            </div>
            <div style="background:#f9f9f9;padding:18px 36px;text-align:center;color:#aaa;font-size:12px;">
              Raja Mill Road, Simmakal, Madurai - 625001 &nbsp;|&nbsp; +91 8778958663 &nbsp;|&nbsp; vaigaitourism@gmail.com
            </div>
          </div>
        `,
      });
    }

    res.status(201).json({ message: "Booking created", bookingId: booking.bookingId });
  } catch (err) {
    console.error("Booking error:", err);
    res.status(500).json({ message: isProd() ? "Booking failed" : "Booking failed. Please try again." });
  }
};

const getBookingById = async (req, res) => {
  try {
    const bookingId = cleanString(req.params?.bookingId, 50);
    if (!/^BK\d{6,}$/.test(bookingId)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }
    const booking = await Booking.findOne({ bookingId });
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: isProd() ? "Lookup failed" : err.message });
  }
};

export { createBooking, getBookingById };
