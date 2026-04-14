import { Router } from 'express'
import { listDestinations } from '../controllers/destinationsController.js'

const router = Router()

router.get('/', listDestinations)

export default router
