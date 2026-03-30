require('dotenv').config()
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const rateLimit = require('express-rate-limit')

const destinationsRouter = require('./routes/destinations')
const packagesRouter = require('./routes/packages')
const contactRouter = require('./routes/contact')
const bookingRouter = require('./routes/booking')
const adminRouter = require('./routes/admin')

const app = express()
const PORT = process.env.PORT || 5000

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true }))
app.use(express.json({ limit: '10mb' }))

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: 'Too many requests' })
app.use('/api/', limiter)

const contactLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10 })
app.use('/api/contact', contactLimiter)

// ─── MongoDB connection ───────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vaigai-tourism')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err.message))

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/destinations', destinationsRouter)
app.use('/api/packages', packagesRouter)
app.use('/api/contact', contactRouter)
app.use('/api/book-tour', bookingRouter)
app.use('/api/admin', adminRouter)

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }))

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`🚀 Vaigai Tourism API running on http://localhost:${PORT}`)
})
