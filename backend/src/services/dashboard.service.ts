import * as repo from '@/repositories/dashboard.repo'
import type { DashboardSummary } from '@/dto/dashboard.dto'

export async function getSummary(): Promise<DashboardSummary> {
  const today = new Date().toISOString().slice(0, 10)
  const monthStart = today.slice(0, 7) + '-01'

  const [stats, salesRank, purchaseSupplierRank, purchaseProductRank] = await Promise.all([
    repo.getTodayStats(today),
    repo.getMonthlySalesRank(monthStart),
    repo.getMonthlyPurchaseSupplierRank(monthStart),
    repo.getMonthlyPurchaseProductRank(monthStart),
  ])

  return {
    ...stats,
    monthlySalesRank: salesRank,
    monthlyPurchaseSupplierRank: purchaseSupplierRank,
    monthlyPurchaseProductRank: purchaseProductRank,
  }
}
