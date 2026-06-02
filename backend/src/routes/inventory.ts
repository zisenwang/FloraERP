import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { mockInventory } from '../db/mock';

const router = Router();

router.use(authMiddleware);

// Mock inventory adjustments
const mockAdjustments = [
  {
    id: 1,
    product_code: '133.51',
    product_name: '金钱树小型',
    adjust_type: '盘亏',
    qty: -5,
    reason: '搬运损坏',
    operator: 'admin',
    created_at: '2026-05-18',
  },
  {
    id: 2,
    product_code: '215.11',
    product_name: '蝴蝶兰红色',
    adjust_type: '盘盈',
    qty: 10,
    reason: '退货入库',
    operator: 'admin',
    created_at: '2026-05-19',
  },
];

// GET /api/inventory
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    const { search, category } = req.query as { search?: string; category?: string };
    let result = mockInventory;
    if (search) {
      const kw = search.toLowerCase();
      result = result.filter(
        (i) => i.product_name.toLowerCase().includes(kw) || i.product_code.toLowerCase().includes(kw)
      );
    }
    if (category) {
      result = result.filter((i) => i.category === category);
    }
    res.json({ data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// POST /api/inventory/adjust
router.post('/adjust', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    const body = req.body as Record<string, unknown>;
    const adjustment = {
      id: mockAdjustments.length + 1,
      operator: req.user?.username ?? 'unknown',
      created_at: new Date().toISOString().slice(0, 10),
      ...body,
    };
    res.status(201).json({ data: adjustment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// GET /api/inventory/adjustments
router.get('/adjustments', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    res.json({ data: mockAdjustments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

export default router;
