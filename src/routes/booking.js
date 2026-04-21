import { Router } from 'express'
import { createBooking, getBookingById } from '../controllers/bookingController.js'

const router = Router()

router.post('/', createBooking)
router.get('/:bookingId', getBookingById)

export default router
