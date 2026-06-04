import client from './client'

export interface SalesOrderItem {
  product_code: string
  product_name: string
  supplier_name: string
  qty: number
  unit_price: number
  discount: number
  amount: number
}

export interface SalesOrder {
  id: number
  order_no: string
  customer_id: number
  customer_name: string
  order_date: string
  total_amount: number
  paid_amount: number
  status: string        // draft | confirmed | cancelled
  pay_status: string    // unpaid | partial | paid
  notes?: string
  items: SalesOrderItem[]
}

export interface SalesOrderPayload {
  customer_id: number
  order_date: string
  notes?: string
  items: Omit<SalesOrderItem, 'amount'>[]
}

export const getSalesOrders = async (params?: {
  customer_id?: number
  start_date?: string
  end_date?: string
  pay_status?: string
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
