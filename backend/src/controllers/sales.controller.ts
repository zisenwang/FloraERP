import type { Response } from 'express'
import type { AuthRequest } from '@/middleware/auth'
import * as service from '@/services/sales.service'

export async function listOrders(req: AuthRequest, res: Response): Promise<void> {
  const { customerId, paymentStatus, startDate, endDate, search } = req.query as Record<
    string,
    string | undefined
  >
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

export async function listReturns(_req: AuthRequest, res: Response): Promise<void> {
  res.json({ data: [] })
}
