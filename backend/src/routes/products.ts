import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { mockProducts } from '../db/mock';

const router = Router();

router.use(authMiddleware);

// GET /api/products?supplier_id=xxx&search=xxx
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    const { supplier_id, search } = req.query as { supplier_id?: string; search?: string };
    let result = mockProducts;
    if (supplier_id) {
      result = result.filter((p) => p.supplier_id === Number(supplier_id));
    }
    if (search) {
      const kw = search.toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(kw) || p.code.toLowerCase().includes(kw)
      );
    }
    res.json({ data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    const id = Number(req.params.id);
    const product = mockProducts.find((p) => p.id === id);
    if (!product) {
      res.status(404).json({ message: '产品不存在' });
      return;
    }
    res.json({ data: product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// POST /api/products
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    const body = req.body as Record<string, unknown>;
    const newProduct = { id: mockProducts.length + 1, ...body };
    res.status(201).json({ data: newProduct });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// PUT /api/products/:id
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    const id = Number(req.params.id);
    const product = mockProducts.find((p) => p.id === id);
    if (!product) {
      res.status(404).json({ message: '产品不存在' });
      return;
    }
    const updated = { ...product, ...req.body };
    res.json({ data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: replace with real SQL
    const id = Number(req.params.id);
    const product = mockProducts.find((p) => p.id === id);
    if (!product) {
      res.status(404).json({ message: '产品不存在' });
      return;
    }
    res.json({ data: { message: '删除成功', id } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

export default router;
