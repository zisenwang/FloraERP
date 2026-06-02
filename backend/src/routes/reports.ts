import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { mockSalesOrders, mockPurchaseOrders, mockInventory } from '../db/mock';

const router = Router();

router.use(authMiddleware);

// GET /api/reports/sales
router.get('/sales', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    const { start_date, end_date, customer_id } = req.query as Record<string, string | undefined>;
    let orders = mockSalesOrders;
    if (start_date) orders = orders.filter((o) => o.order_date >= start_date);
    if (end_date) orders = orders.filter((o) => o.order_date <= end_date);
    if (customer_id) orders = orders.filter((o) => o.customer_id === Number(customer_id));

    const totalAmount = orders.reduce((sum, o) => sum + o.total_amount, 0);
    const totalPaid = orders.reduce((sum, o) => sum + o.paid_amount, 0);
    const report = {
      total_orders: orders.length,
      total_amount: totalAmount,
      total_paid: totalPaid,
      total_unpaid: totalAmount - totalPaid,
      orders,
    };
    res.json({ data: report });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// GET /api/reports/purchase
router.get('/purchase', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    const { start_date, end_date, supplier_id } = req.query as Record<string, string | undefined>;
    let orders = mockPurchaseOrders;
    if (start_date) orders = orders.filter((o) => o.order_date >= start_date);
    if (end_date) orders = orders.filter((o) => o.order_date <= end_date);
    if (supplier_id) orders = orders.filter((o) => o.supplier_id === Number(supplier_id));

    const totalAmount = orders.reduce((sum, o) => sum + o.total_amount, 0);
    const totalPaid = orders.reduce((sum, o) => sum + o.paid_amount, 0);
    const report = {
      total_orders: orders.length,
      total_amount: totalAmount,
      total_paid: totalPaid,
      total_unpaid: totalAmount - totalPaid,
      orders,
    };
    res.json({ data: report });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// GET /api/reports/inventory
router.get('/inventory', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    const { category } = req.query as { category?: string };
    let result = mockInventory;
    if (category) result = result.filter((i) => i.category === category);

    const totalItems = result.length;
    const lowStockItems = result.filter((i) => i.stock <= i.alert_stock);
    const report = {
      total_items: totalItems,
      low_stock_count: lowStockItems.length,
      low_stock_items: lowStockItems,
      inventory: result,
    };
    res.json({ data: report });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

export default router;
