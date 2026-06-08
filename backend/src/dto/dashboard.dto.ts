export interface SalesRankRow {
  customerName: string
  totalAmount: number
  totalPieces: number
}

export interface PurchaseRankRow {
  supplierName: string
  totalAmount: number
  totalQty: number
}

export interface DashboardSummary {
  todaySales: number
  todayIncome: number
  todayPurchase: number
  todayOrderCount: number
  monthlySalesRank: SalesRankRow[]
  monthlyPurchaseRank: PurchaseRankRow[]
}
