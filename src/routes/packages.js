import { Router } from 'express'
import { listPackages, getPackageById } from '../controllers/packagesController.js'

const router = Router()

router.get('/', listPackages)
router.get('/:id', getPackageById)

export default router
