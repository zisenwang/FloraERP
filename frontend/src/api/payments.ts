import client from './client'

export interface Payment {
  id: number
  payment_no: string
  type: string           // 收款 | 付款
  related_order_no: string
  party_name: string
  amount: number
  payment_method: string
  payment_date: string
  operator: string
  remark: string
}

export interface PaymentPayload {
  type: string
  related_order_no: string
  party_name: string
  amount: number
  payment_method: string
  remark?: string
}

export const getPayments = async (params?: {
  type?: string
  start_date?: string
  end_date?: string
}): Promise<Payment[]> => {
  const res = await client.get<{ data: Payment[] }>('/payments', { params })
  return res.data.data
}

export const createPayment = async (payload: PaymentPayload): Promise<Payment> => {
  const res = await client.post<{ data: Payment }>('/payments', payload)
  return res.data.data
}
