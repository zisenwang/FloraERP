import type { Response } from 'express'
import type { AuthRequest } from '@/middleware/auth'
import * as service from '@/services/reports.service'

export async function salesReport(req: AuthRequest, res: Response): Promise<void> {
  const { startDate, endDate, customerId } = req.query as Record<string, string | undefined>
  const data = await service.getSalesReport({
    startDate,
    endDate,
    customerId: customerId ? Number(customerId) : undefined,
  })
  res.json({ data })
}

export async function purchaseReport(req: AuthRequest, res: Response): Promise<void> {
  const { startDate, endDate, supplierId } = req.query as Record<string, string | undefined>
  const data = await service.getPurchaseReport({
    startDate,
    endDate,
    supplierId: supplierId ? Number(supplierId) : undefined,
  })
  res.json({ data })
}

export async function inventoryReport(req: AuthRequest, res: Response): Promise<void> {
  const { category, supplierId } = req.query as Record<string, string | undefined>
  const data = await service.getInventoryReport({
    category,
    supplierId: supplierId ? Number(supplierId) : undefined,
  })
  res.json({ data })
}
