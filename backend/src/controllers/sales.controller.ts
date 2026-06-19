import type { Response } from 'express'
import type { AuthRequest } from '@/middleware/auth'
import * as service from '@/services/sales.service'
import * as returnService from '@/services/sales-return.service'

export async function listOrders(req: AuthRequest, res: Response): Promise<void> {
  const { customerId, paymentStatus, startDate, endDate, search } = req.query as Record<string, string | undefined>
  const data = await service.listOrders({
    customerId: customerId ? Number(customerId) : undefined,
    paymentStatus,
    startDate,
    endDate,
    search,
  })
  res.json({ data })
}

export async function getOrder(req: AuthRequest, res: Response): Promise<void> {
  const data = await service.getOrder(Number(req.params.id))
  res.json({ data })
}

export async function createOrder(req: AuthRequest, res: Response): Promise<void> {
  const { customerId, orderDate, notes, items } = req.body
  const data = await service.createOrder(
    { customerId, orderDate, notes, items },
    req.user?.username ?? null,
  )
  res.status(201).json({ data })
}

export async function updateOrder(req: AuthRequest, res: Response): Promise<void> {
  const { customerId, orderDate, notes, items } = req.body
  const data = await service.updateOrder(Number(req.params.id), {
    customerId,
    orderDate,
    notes,
    items,
  })
  res.json({ data })
}

export async function deleteOrder(req: AuthRequest, res: Response): Promise<void> {
  await service.deleteOrder(Number(req.params.id))
  res.json({ message: '删除成功' })
}

export async function listReturns(req: AuthRequest, res: Response): Promise<void> {
  const { customerId, startDate, endDate, search } = req.query as Record<string, string | undefined>
  const data = await returnService.listReturns({
    customerId: customerId ? Number(customerId) : undefined,
    startDate,
    endDate,
    search,
  })
  res.json({ data })
}

export async function getReturn(req: AuthRequest, res: Response): Promise<void> {
  const data = await returnService.getReturn(Number(req.params.id))
  res.json({ data })
}

export async function createReturn(req: AuthRequest, res: Response): Promise<void> {
  const { customerId, returnDate, originalOrderId, notes, items } = req.body
  const data = await returnService.createReturn(
    { customerId, returnDate, originalOrderId, notes, items },
    req.user?.username ?? null,
  )
  res.status(201).json({ data })
}

export async function updateReturn(req: AuthRequest, res: Response): Promise<void> {
  const { customerId, returnDate, originalOrderId, notes, items } = req.body
  const data = await returnService.updateReturn(Number(req.params.id), {
    customerId,
    returnDate,
    originalOrderId,
    notes,
    items,
  })
  res.json({ data })
}

export async function deleteReturn(req: AuthRequest, res: Response): Promise<void> {
  await returnService.deleteReturn(Number(req.params.id))
  res.json({ message: '删除成功' })
}
