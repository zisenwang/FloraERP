import type { Request, Response, NextFunction } from 'express'
import { AppError } from '@/services/supplier.service'

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message })
    return
  }
  console.error(err)
  res.status(500).json({ message: '服务器内部错误' })
}
