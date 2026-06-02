import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'flora_erp_secret';

// Hardcoded admin credentials (hash of 'admin123')
const ADMIN_USERS = [
  {
    id: 1,
    username: 'admin',
    // bcrypt hash of 'admin123'
    passwordHash: '$2b$10$.KT6XQ1SoyDKAnEEVgrY0OTXYU4IRFC5X9zxeFmDG9v7xiQYDxbBm',
    role: 'admin',
    name: '系统管理员',
  },
];

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };
    console.log(username, password)

    if (!username || !password) {
      res.status(400).json({ message: '用户名和密码不能为空' });
      return;
    }

    // TODO: replace with real SQL
    const user = ADMIN_USERS.find((u) => u.username === username);
    if (!user) {
      res.status(401).json({ message: '用户名或密码错误' });
      console.log('user not found')
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({ message: '用户名或密码错误' });
      console.log('password not match')
      return;
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      data: {
        token,
        user: { id: user.id, username: user.username, role: user.role, name: user.name },
      },
    });
    console.log('login success')
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

export default router;
