import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

// Mock loss records
const mockLossRecords = [
  {
    id: 1,
    loss_no: 'L20265G19_001',
    product_code: '195.03',
    product_name: '墨兰特级',
    qty: 2,
    unit_price: 280.00,
    total_amount: 560.00,
    reason: '运输途中冻伤',
    operator: 'admin',
    loss_date: '2026-05-19',
  },
  {
    id: 2,
    loss_no: 'L20265G17_002',
    product_code: '215.11',
    product_name: '蝴蝶兰红色',
    qty: 5,
    unit_price: 88.00,
    total_amount: 440.00,
    reason: '仓储过久枯萎',
    operator: 'admin',
    loss_date: '2026-05-17',
  },
];

// GET /api/loss
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    const { start_date, end_date } = req.query as { start_date?: string; end_date?: string };
    let result = mockLossRecords;
    if (start_date) result = result.filter((l) => l.loss_date >= start_date);
    if (end_date) result = result.filter((l) => l.loss_date <= end_date);
    res.json({ data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// POST /api/loss
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    const body = req.body as Record<string, unknown>;
    const newRecord = {
      id: mockLossRecords.length + 1,
      loss_no: `L${Date.now()}`,
      operator: req.user?.username ?? 'unknown',
      loss_date: new Date().toISOString().slice(0, 10),
      ...body,
    };
    res.status(201).json({ data: newRecord });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

export default router;
