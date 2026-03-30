const mongoose = require('mongoose')

// ─── Destination ──────────────────────────────────────────────────────────────
const destinationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  tagline: String,
  description: String,
  image: String,
  category: { type: String, enum: ['Heritage', 'Spiritual', 'Coastal', 'Hill Station', 'Nature'] },
  rating: { type: Number, default: 4.5 },
  tours: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true })

// ─── Package ──────────────────────────────────────────────────────────────────
const packageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  subtitle: String,
  duration: { type: String, required: true },
  price: { type: Number, required: true },
  originalPrice: Number,
  image: String,
  destination: String,
  category: String,
  highlights: [String],
  includes: [String],
  badge: String,
  rating: { type: Number, default: 4.5 },
  reviews: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true })

// ─── Booking ──────────────────────────────────────────────────────────────────
const bookingSchema = new mongoose.Schema({
  bookingId: { type: String, default: () => 'BK' + Date.now().toString().slice(-6) },
  packageId: String,
  packageName: String,
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  travelDate: Date,
  people: { type: Number, default: 1 },
  totalAmount: Number,
  specialRequests: String,
  status: { type: String, enum: ['Pending', 'Confirmed', 'Cancelled'], default: 'Pending' },
  paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Refunded'], default: 'Pending' },
}, { timestamps: true })

// ─── Message ──────────────────────────────────────────────────────────────────
const messageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
}, { timestamps: true })

// ─── Admin ────────────────────────────────────────────────────────────────────
const adminSchema = new mongoose.Schema({
  name: { type: String, default: 'Admin' },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
}, { timestamps: true })

module.exports = {
  Destination: mongoose.model('Destination', destinationSchema),
  Package: mongoose.model('Package', packageSchema),
  Booking: mongoose.model('Booking', bookingSchema),
  Message: mongoose.model('Message', messageSchema),
  Admin: mongoose.model('Admin', adminSchema),
}
