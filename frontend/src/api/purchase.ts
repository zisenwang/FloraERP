import client from './client'

export interface PurchaseOrderItem {
  id: number
  productId: number
  productCode: string
  productName: string
  unit: string
  qty: number
  unitPrice: number
  amount: number
  discount: number
  finalAmount: number
  spec: string
  notes: string
}

export interface PurchaseOrder {
  id: number
  orderNo: string
  supplierId: number
  supplierName: string
  supplierCode: string
  orderDate: string
  totalQty: number
  totalAmount: number
  discount: number
  finalAmount: number
  operator: string
  notes: string
  status: string
  createdAt: string
  items: PurchaseOrderItem[]
}

export interface PurchaseOrderPayload {
  supplierId: number
  orderDate: string
  discount?: number
  notes?: string
  items: {
    productId: number
    qty: number
    unitPrice: number
    discount?: number
    spec?: string
    notes?: string
  }[]
}

export const getPurchaseOrders = async (params?: {
  supplierId?: number
  startDate?: string
  endDate?: string
  search?: string
}): Promise<PurchaseOrder[]> => {
  const res = await client.get<{ data: PurchaseOrder[] }>('/purchase/orders', { params })
  return res.data.data
}

export const getPurchaseOrder = async (id: number): Promise<PurchaseOrder> => {
  const res = await client.get<{ data: PurchaseOrder }>(`/purchase/orders/${id}`)
  return res.data.data
}

export const createPurchaseOrder = async (payload: PurchaseOrderPayload): Promise<PurchaseOrder> => {
  const res = await client.post<{ data: PurchaseOrder }>('/purchase/orders', payload)
  return res.data.data
}

export const updatePurchaseOrder = async (id: number, payload: PurchaseOrderPayload): Promise<PurchaseOrder> => {
  const res = await client.put<{ data: PurchaseOrder }>(`/purchase/orders/${id}`, payload)
  return res.data.data
}
