import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

// Mock payment records
const mockPayments = [
  {
    id: 1,
    payment_no: 'PAY20265G20_001',
    type: '收款',
    related_order_no: 'X20265G20_D701',
    party_name: '西安王蒙',
    amount: 4560.00,
    payment_method: '银行转账',
    payment_date: '2026-05-20',
    operator: 'admin',
    remark: '',
  },
  {
    id: 2,
    payment_no: 'PAY20265G19_002',
    type: '收款',
    related_order_no: 'X20265G19_D698',
    party_name: '昆明朱力诗',
    amount: 9600.00,
    payment_method: '支付宝',
    payment_date: '2026-05-19',
    operator: 'admin',
    remark: '',
  },
  {
    id: 3,
    payment_no: 'PAY20265G20_003',
    type: '付款',
    related_order_no: 'P20265G20_001',
    party_name: '广阔',
    amount: 12600.00,
    payment_method: '银行转账',
    payment_date: '2026-05-20',
    operator: 'admin',
    remark: '',
  },
  {
    id: 4,
    payment_no: 'PAY20265G19_004',
    type: '付款',
    related_order_no: 'P20265G19_002',
    party_name: '维强',
    amount: 10000.00,
    payment_method: '银行转账',
    payment_date: '2026-05-19',
    operator: 'admin',
    remark: '部分付款',
  },
];

// GET /api/payments?type=收款|付款&start_date=&end_date=
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    const { type, start_date, end_date } = req.query as Record<string, string | undefined>;
    let result = mockPayments;
    if (type) result = result.filter((p) => p.type === type);
    if (start_date) result = result.filter((p) => p.payment_date >= start_date);
    if (end_date) result = result.filter((p) => p.payment_date <= end_date);
    res.json({ data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// POST /api/payments
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    const body = req.body as Record<string, unknown>;
    const newPayment = {
      id: mockPayments.length + 1,
      payment_no: `PAY${Date.now()}`,
      operator: req.user?.username ?? 'unknown',
      payment_date: new Date().toISOString().slice(0, 10),
      ...body,
    };
    res.status(201).json({ data: newPayment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

export default router;
