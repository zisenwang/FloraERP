import { Router } from 'express'
import * as ctrl from '@/controllers/auth.controller'
import { authMiddleware } from '@/middleware/auth'

const router = Router()
router.post('/login', ctrl.login)
router.get('/users', authMiddleware, ctrl.listUsers)
router.post('/users', authMiddleware, ctrl.createUser)
router.put('/users/:id', authMiddleware, ctrl.updateUser)
router.put('/users/:id/password', authMiddleware, ctrl.changePassword)
export default router
