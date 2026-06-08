import * as repo from '@/repositories/dashboard.repo'
import type { DashboardSummary } from '@/dto/dashboard.dto'

export async function getSummary(): Promise<DashboardSummary> {
  const today = new Date().toISOString().slice(0, 10)
  const monthStart = today.slice(0, 7) + '-01'

  const [stats, salesRank, purchaseRank] = await Promise.all([
    repo.getTodayStats(today),
    repo.getMonthlySalesRank(monthStart),
    repo.getMonthlyPurchaseRank(monthStart),
  ])

  return { ...stats, monthlySalesRank: salesRank, monthlyPurchaseRank: purchaseRank }
}
