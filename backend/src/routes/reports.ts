import { Router } from 'express'
import { authMiddleware } from '@/middleware/auth'
import * as ctrl from '@/controllers/reports.controller'

const router = Router()
router.use(authMiddleware)
router.get('/sales', ctrl.salesReport)
router.get('/purchase', ctrl.purchaseReport)
router.get('/inventory', ctrl.inventoryReport)
export default router
