import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { mockPurchaseOrders } from '../db/mock';

const router = Router();

router.use(authMiddleware);

// Mock purchase returns data
const mockPurchaseReturns = [
  {
    id: 1,
    return_no: 'PR20265G18_001',
    purchase_order_no: 'P20265G18_003',
    supplier_name: '吉庆',
    return_date: '2026-05-19',
    reason: '品质不达标',
    total_amount: 880.00,
    status: '已退货',
    items: [{ product_code: '215.11', product_name: '蝴蝶兰红色', qty: 10, unit_price: 88.00, amount: 880.00 }],
  },
];

// GET /api/purchase/orders
router.get('/orders', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    const { supplier_id, status, start_date, end_date } = req.query as Record<string, string | undefined>;
    let result = mockPurchaseOrders;
    if (supplier_id) result = result.filter((o) => o.supplier_id === Number(supplier_id));
    if (status) result = result.filter((o) => o.status === status);
    if (start_date) result = result.filter((o) => o.order_date >= start_date);
    if (end_date) result = result.filter((o) => o.order_date <= end_date);
    res.json({ data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// GET /api/purchase/orders/:id
router.get('/orders/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    const id = Number(req.params.id);
    const order = mockPurchaseOrders.find((o) => o.id === id);
    if (!order) {
      res.status(404).json({ message: '采购订单不存在' });
      return;
    }
    res.json({ data: order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// POST /api/purchase/orders
router.post('/orders', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    const body = req.body as Record<string, unknown>;
    const newOrder = {
      id: mockPurchaseOrders.length + 1,
      order_no: `P${Date.now()}`,
      status: '待入库',
      ...body,
    };
    res.status(201).json({ data: newOrder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// GET /api/purchase/returns
router.get('/returns', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    res.json({ data: mockPurchaseReturns });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// POST /api/purchase/returns
router.post('/returns', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    const body = req.body as Record<string, unknown>;
    const newReturn = {
      id: mockPurchaseReturns.length + 1,
      return_no: `PR${Date.now()}`,
      status: '已退货',
      ...body,
    };
    res.status(201).json({ data: newReturn });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

export default router;
