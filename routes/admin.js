const router = require('express').Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const auth = require('../middleware/auth')
const { Admin, Package, Booking, Message, Destination } = require('../models')

const JWT_SECRET = process.env.JWT_SECRET || 'vaigai_secret'

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  try {
    let admin = await Admin.findOne({ email })

    // Auto-create admin from env if not in DB
    if (!admin) {
      if (email === (process.env.ADMIN_EMAIL || 'admin@vaigai.com') &&
          password === (process.env.ADMIN_PASSWORD || 'admin123')) {
        const hashed = await bcrypt.hash(password, 12)
        admin = await Admin.create({ email, password: hashed, name: 'Admin' })
      } else {
        return res.status(401).json({ message: 'Invalid credentials' })
      }
    }

    const valid = await bcrypt.compare(password, admin.password)
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' })

    const token = jwt.sign({ id: admin._id, email: admin.email }, JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    })
    res.json({ token, email: admin.email, name: admin.name })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ─── Stats ────────────────────────────────────────────────────────────────────
router.get('/stats', auth, async (req, res) => {
  const [packages, bookings, messages, revenue] = await Promise.all([
    Package.countDocuments({ active: true }),
    Booking.countDocuments(),
    Message.countDocuments({ read: false }),
    Booking.aggregate([{ $group: { _id: null, total: { $sum: '$totalAmount' } } }])
  ])
  res.json({ packages, bookings, unreadMessages: messages, revenue: revenue[0]?.total || 0 })
})

// ─── Package CRUD ─────────────────────────────────────────────────────────────
router.get('/packages', auth, async (req, res) => {
  res.json(await Package.find().sort('-createdAt'))
})

router.post('/packages', auth, async (req, res) => {
  try {
    const pkg = await Package.create(req.body)
    res.status(201).json(pkg)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

router.put('/packages/:id', auth, async (req, res) => {
  try {
    const pkg = await Package.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!pkg) return res.status(404).json({ message: 'Not found' })
    res.json(pkg)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

router.delete('/packages/:id', auth, async (req, res) => {
  try {
    await Package.findByIdAndDelete(req.params.id)
    res.json({ message: 'Package deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ─── Bookings ─────────────────────────────────────────────────────────────────
router.get('/bookings', auth, async (req, res) => {
  res.json(await Booking.find().sort('-createdAt'))
})

router.patch('/bookings/:id/status', auth, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true })
    res.json(booking)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// ─── Messages ─────────────────────────────────────────────────────────────────
router.get('/messages', auth, async (req, res) => {
  res.json(await Message.find().sort('-createdAt'))
})

router.patch('/messages/:id/read', auth, async (req, res) => {
  await Message.findByIdAndUpdate(req.params.id, { read: true })
  res.json({ success: true })
})

module.exports = router
