import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { mockSuppliers } from '../db/mock';

const router = Router();

router.use(authMiddleware);

// GET /api/suppliers?search=xxx
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    const { search } = req.query as { search?: string };
    let result = mockSuppliers;
    if (search) {
      const kw = search.toLowerCase();
      result = mockSuppliers.filter(
        (s) => s.name.toLowerCase().includes(kw) || s.code.includes(kw)
      );
    }
    res.json({ data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// GET /api/suppliers/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    const id = Number(req.params.id);
    const supplier = mockSuppliers.find((s) => s.id === id);
    if (!supplier) {
      res.status(404).json({ message: '供应商不存在' });
      return;
    }
    res.json({ data: supplier });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// POST /api/suppliers
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    const body = req.body as Record<string, unknown>;
    const newSupplier = { id: mockSuppliers.length + 1, ...body, created_at: new Date().toISOString().slice(0, 10) };
    res.status(201).json({ data: newSupplier });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// PUT /api/suppliers/:id
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    const id = Number(req.params.id);
    const supplier = mockSuppliers.find((s) => s.id === id);
    if (!supplier) {
      res.status(404).json({ message: '供应商不存在' });
      return;
    }
    const updated = { ...supplier, ...req.body };
    res.json({ data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// DELETE /api/suppliers/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    const id = Number(req.params.id);
    const supplier = mockSuppliers.find((s) => s.id === id);
    if (!supplier) {
      res.status(404).json({ message: '供应商不存在' });
      return;
    }
    res.json({ data: { message: '删除成功', id } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

export default router;
