import { Router } from 'express'
import { authMiddleware } from '@/middleware/auth'
import * as ctrl from '@/controllers/purchase.controller'

const router = Router()
router.use(authMiddleware)
router.get('/orders', ctrl.listOrders)
router.get('/orders/:id', ctrl.getOrder)
router.post('/orders', ctrl.createOrder)
router.put('/orders/:id', ctrl.updateOrder)
router.get('/returns', ctrl.listReturns)
export default router
