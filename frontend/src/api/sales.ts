import client from './client'

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
  notes: string
}

export interface SalesOrder {
  id: number
  orderNo: string
  customerId: number
  customerName: string
  customerCode: string
  customerPhone: string
  orderDate: string
  totalQty: number
  totalAmount: number
  totalPieces: number
  paymentStatus: string   // "未收款" | "部分收款" | "已收款"
  operator: string
  notes: string
  status: string
  createdAt: string
  items: SalesOrderItem[]
}

export interface SalesOrderPayload {
  customerId: number
  orderDate: string
  notes?: string
  items: {
    productId: number
    supplierId?: number
    qty: number
    unitPrice: number
    discount?: number
    pieces?: number
    notes?: string
  }[]
}

export const getSalesOrders = async (params?: {
  customerId?: number
  paymentStatus?: string
  startDate?: string
  endDate?: string
  search?: string
}): Promise<SalesOrder[]> => {
  const res = await client.get<{ data: SalesOrder[] }>('/sales/orders', { params })
  return res.data.data
}

export const getSalesOrder = async (id: number): Promise<SalesOrder> => {
  const res = await client.get<{ data: SalesOrder }>(`/sales/orders/${id}`)
  return res.data.data
}

export const createSalesOrder = async (payload: SalesOrderPayload): Promise<SalesOrder> => {
  const res = await client.post<{ data: SalesOrder }>('/sales/orders', payload)
  return res.data.data
}

export const updateSalesOrder = async (id: number, payload: SalesOrderPayload): Promise<SalesOrder> => {
  const res = await client.put<{ data: SalesOrder }>(`/sales/orders/${id}`, payload)
  return res.data.data
}
