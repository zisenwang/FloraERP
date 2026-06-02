import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { mockCustomers } from '../db/mock';

const router = Router();

router.use(authMiddleware);

// GET /api/customers?search=xxx
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    const { search } = req.query as { search?: string };
    let result = mockCustomers;
    if (search) {
      const kw = search.toLowerCase();
      result = mockCustomers.filter(
        (c) => c.name.toLowerCase().includes(kw) || c.code.includes(kw)
      );
    }
    res.json({ data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// GET /api/customers/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    const id = Number(req.params.id);
    const customer = mockCustomers.find((c) => c.id === id);
    if (!customer) {
      res.status(404).json({ message: '客户不存在' });
      return;
    }
    res.json({ data: customer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// POST /api/customers
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    const body = req.body as Record<string, unknown>;
    const newCustomer = { id: mockCustomers.length + 1, ...body, created_at: new Date().toISOString().slice(0, 10) };
    res.status(201).json({ data: newCustomer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// PUT /api/customers/:id
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    const id = Number(req.params.id);
    const customer = mockCustomers.find((c) => c.id === id);
    if (!customer) {
      res.status(404).json({ message: '客户不存在' });
      return;
    }
    const updated = { ...customer, ...req.body };
    res.json({ data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// DELETE /api/customers/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    const id = Number(req.params.id);
    const customer = mockCustomers.find((c) => c.id === id);
    if (!customer) {
      res.status(404).json({ message: '客户不存在' });
      return;
    }
    res.json({ data: { message: '删除成功', id } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

export default router;