export interface SalesOrderItem {
  id: number
  productId: number
  productCode: string
  productName: string
  supplierId: number
  supplierCode: string
  supplierName: string
  unit: string
  qty: number
  unitPrice: number
  amount: number
  discount: number
  finalAmount: number
  pieces: number
  notes: string | null
}

export interface SalesOrder {
  id: number
  orderNo: string
  customerId: number
  customerName: string
  customerCode: string
  customerPhone: string | null
  orderDate: string
  totalQty: number
  totalAmount: number
  totalPieces: number
  paymentStatus: '未收款' | '已收款' | '部分收款'
  operator: string | null
  notes: string | null
  status: 'draft' | 'confirmed'
  createdAt: string
  items?: SalesOrderItem[]
}

export interface CreateSalesItemDto {
  productId: number
  supplierId: number
  qty: number
  unitPrice: number
  discount?: number // default 100
  pieces?: number // default 0
  notes?: string
}

export interface CreateSalesOrderDto {
  customerId: number
  orderDate: string
  notes?: string
  items: CreateSalesItemDto[]
}

export interface UpdateSalesOrderDto extends CreateSalesOrderDto {}
