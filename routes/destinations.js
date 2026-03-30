// routes/destinations.js
const router = require('express').Router()
const { Destination } = require('../models')

router.get('/', async (req, res) => {
  try {
    const destinations = await Destination.find({ active: true }).sort('-createdAt')
    res.json(destinations)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
