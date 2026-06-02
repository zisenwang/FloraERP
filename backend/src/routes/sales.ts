import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { mockSalesOrders } from '../db/mock';

const router = Router();

router.use(authMiddleware);

// Mock sales returns data
const mockSalesReturns = [
  {
    id: 1,
    return_no: 'SR20265G19_001',
    sales_order_no: 'X20265G18_D695',
    customer_name: '南京叶蓉',
    return_date: '2026-05-20',
    reason: '客户取消部分订单',
    total_amount: 880.00,
    status: '已退货',
    items: [{ product_code: '215.11', product_name: '蝴蝶兰红色', qty: 10, unit_price: 88.00, amount: 880.00 }],
  },
];

// GET /api/sales/orders
router.get('/orders', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    const { customer_id, status, start_date, end_date } = req.query as Record<string, string | undefined>;
    let result = mockSalesOrders;
    if (customer_id) result = result.filter((o) => o.customer_id === Number(customer_id));
    if (status) result = result.filter((o) => o.status === status);
    if (start_date) result = result.filter((o) => o.order_date >= start_date);
    if (end_date) result = result.filter((o) => o.order_date <= end_date);
    res.json({ data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// GET /api/sales/orders/:id
router.get('/orders/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    const id = Number(req.params.id);
    const order = mockSalesOrders.find((o) => o.id === id);
    if (!order) {
      res.status(404).json({ message: '销售订单不存在' });
      return;
    }
    res.json({ data: order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// POST /api/sales/orders
router.post('/orders', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    const body = req.body as Record<string, unknown>;
    const newOrder = {
      id: mockSalesOrders.length + 1,
      order_no: `X${Date.now()}`,
      status: '待发货',
      ...body,
    };
    res.status(201).json({ data: newOrder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// GET /api/sales/returns
router.get('/returns', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    res.json({ data: mockSalesReturns });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// POST /api/sales/returns
router.post('/returns', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    const body = req.body as Record<string, unknown>;
    const newReturn = {
      id: mockSalesReturns.length + 1,
      return_no: `SR${Date.now()}`,
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
