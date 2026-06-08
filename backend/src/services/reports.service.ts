import * as repo from '@/repositories/reports.repo'
import type {
  SalesReportResult,
  PurchaseReportResult,
  InventoryReportResult,
} from '@/dto/reports.dto'

export async function getSalesReport(filters: {
  startDate?: string
  endDate?: string
  customerId?: number
}): Promise<SalesReportResult> {
  const [orders, stats, totalPaid] = await Promise.all([
    repo.getSalesOrders(filters),
    repo.getSalesStats(filters),
    repo.getSalesPaid(filters),
  ])
  return {
    ...stats,
    totalPaid,
    totalUnpaid: +(stats.totalAmount - totalPaid).toFixed(2),
    orders,
  }
}

export async function getPurchaseReport(filters: {
  startDate?: string
  endDate?: string
  supplierId?: number
}): Promise<PurchaseReportResult> {
  const [orders, stats] = await Promise.all([
    repo.getPurchaseOrders(filters),
    repo.getPurchaseStats(filters),
  ])
  return { ...stats, orders }
}

export async function getInventoryReport(filters: {
  category?: string
  supplierId?: number
}): Promise<InventoryReportResult> {
  const inventory = await repo.getInventoryRows(filters)
  const totalStock = inventory.reduce((s, r) => s + Number(r.stock), 0)
  return { totalItems: inventory.length, totalStock, inventory }
}
