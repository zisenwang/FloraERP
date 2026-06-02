import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { mockDashboard } from '../db/mock';

const router = Router();

// GET /api/dashboard/summary
router.get('/summary', authMiddleware, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    res.json({ data: mockDashboard });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

export default router;
