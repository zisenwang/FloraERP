import type { Response } from 'express'
import type { AuthRequest } from '@/middleware/auth'
import * as service from '@/services/purchase.service'
import * as returnService from '@/services/purchase-return.service'

export async function listOrders(req: AuthRequest, res: Response): Promise<void> {
  const { supplierId, startDate, endDate, search } = req.query as Record<string, string | undefined>
  const data = await service.listOrders({
    supplierId: supplierId ? Number(supplierId) : undefined,
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
  const { supplierId, orderDate, discount, notes, items } = req.body
  const data = await service.createOrder(
    { supplierId, orderDate, discount, notes, items },
    req.user?.username ?? null,
  )
  res.status(201).json({ data })
}

export async function updateOrder(req: AuthRequest, res: Response): Promise<void> {
  const { supplierId, orderDate, discount, notes, items } = req.body
  const data = await service.updateOrder(Number(req.params.id), {
    supplierId,
    orderDate,
    discount,
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
  const { supplierId, startDate, endDate, search } = req.query as Record<string, string | undefined>
  const data = await returnService.listReturns({
    supplierId: supplierId ? Number(supplierId) : undefined,
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
  const { supplierId, returnDate, originalOrderId, notes, items } = req.body
  const data = await returnService.createReturn(
    { supplierId, returnDate, originalOrderId, notes, items },
    req.user?.username ?? null,
  )
  res.status(201).json({ data })
}

export async function updateReturn(req: AuthRequest, res: Response): Promise<void> {
  const { supplierId, returnDate, originalOrderId, notes, items } = req.body
  const data = await returnService.updateReturn(Number(req.params.id), {
    supplierId,
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
