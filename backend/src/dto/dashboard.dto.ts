export interface SalesRankRow {
  customerCode: string
  customerName: string
  totalAmount: number
  totalPieces: number
}

export interface PurchaseSupplierRankRow {
  supplierCode: string
  supplierName: string
  totalQty: number
}

export interface PurchaseProductRankRow {
  productCode: string
  productName: string
  supplierCode: string
  supplierName: string
  totalQty: number
}

export interface ProductProfitRankRow {
  productCode: string
  productName: string
  supplierCode: string
  supplierName: string
  totalProfit: number
  totalQty: number
}

export interface DashboardSummary {
  todaySales: number
  todayIncome: number
  todayPurchase: number
  todayOrderCount: number
  monthlySalesRank: SalesRankRow[]
  monthlyPurchaseSupplierRank: PurchaseSupplierRankRow[]
  monthlyPurchaseProductRank: PurchaseProductRankRow[]
  monthlyProductProfitRank: ProductProfitRankRow[]
}
