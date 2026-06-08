import type { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import pool from '@/db/pool'
import type { RowDataPacket } from 'mysql2'

const JWT_SECRET = process.env.JWT_SECRET || 'flora_erp_secret'

interface UserRow extends RowDataPacket {
  id: number
  username: string
  password_hash: string
  name: string
  role: string
  status: number
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body as { username?: string; password?: string }
    if (!username || !password) {
      res.status(400).json({ message: '用户名和密码不能为空' })
      return
    }

    const [rows] = await pool.query<UserRow[]>(
      'SELECT id, username, password_hash, name, role, status FROM users WHERE username = ? LIMIT 1',
      [username],
    )
    const user = rows[0]
    if (!user || user.status === 0) {
      res.status(401).json({ message: '用户名或密码错误' })
      return
    }

    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) {
      res.status(401).json({ message: '用户名或密码错误' })
      return
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, {
      expiresIn: '8h',
    })
    res.json({
      data: {
        token,
        user: { id: user.id, username: user.username, role: user.role, name: user.name },
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: '服务器内部错误' })
  }
}
