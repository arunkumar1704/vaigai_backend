import { Destination } from '../models/index.js'

const listDestinations = async (req, res) => {
  try {
    const destinations = await Destination.find({ active: true }).sort('-createdAt')
    res.json(destinations)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export { listDestinations }
