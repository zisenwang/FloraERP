export interface SalesReportOrder {
  id: number
  orderNo: string
  customerId: number
  customerName: string
  orderDate: string
  totalQty: number
  totalAmount: number
  totalPieces: number
  paymentStatus: string
}

export interface SalesReportResult {
  totalOrders: number
  totalAmount: number
  totalPieces: number
  totalPaid: number
  totalUnpaid: number
  orders: SalesReportOrder[]
}

export interface PurchaseReportOrder {
  id: number
  orderNo: string
  supplierId: number
  supplierName: string
  orderDate: string
  totalQty: number
  totalAmount: number
  finalAmount: number
  status: string
}

export interface PurchaseReportResult {
  totalOrders: number
  totalAmount: number
  totalQty: number
  orders: PurchaseReportOrder[]
}

export interface InventoryReportRow {
  productId: number
  productCode: string
  productName: string
  supplierName: string
  category: string
  unit: string
  stock: number
  price: number
}

export interface InventoryReportResult {
  totalItems: number
  totalStock: number
  inventory: InventoryReportRow[]
}
