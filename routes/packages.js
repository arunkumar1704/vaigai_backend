const router = require('express').Router()
const { Package } = require('../models')

router.get('/', async (req, res) => {
  try {
    const packages = await Package.find({ active: true }).sort('-createdAt')
    res.json(packages)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id)
    if (!pkg) return res.status(404).json({ message: 'Package not found' })
    res.json(pkg)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
