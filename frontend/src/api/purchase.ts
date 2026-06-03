import client from './client'

export interface PurchaseOrderItem {
  product_code: string
  product_name: string
  qty: number
  unit_price: number
  discount: number
  amount: number
}

export interface PurchaseOrder {
  id: number
  order_no: string
  supplier_id: number
  supplier_name: string
  order_date: string
  total_amount: number
  status: string
  items: PurchaseOrderItem[]
}

export interface PurchaseOrderPayload {
  supplier_id: number
  order_date: string
  notes?: string
  items: Omit<PurchaseOrderItem, 'amount'>[]
}

export const getPurchaseOrders = async (params?: {
  supplier_id?: number
  start_date?: string
  end_date?: string
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
