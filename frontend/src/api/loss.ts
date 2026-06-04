import client from './client'

export interface LossRecord {
  id: number
  loss_no: string
  product_code: string
  product_name: string
  qty: number
  unit_price: number
  total_amount: number
  reason: string
  operator: string
  loss_date: string
}

export interface LossPayload {
  product_code: string
  product_name: string
  qty: number
  unit_price: number
  total_amount: number
  reason: string
}

export const getLossRecords = async (params?: {
  start_date?: string
  end_date?: string
}): Promise<LossRecord[]> => {
  const res = await client.get<{ data: LossRecord[] }>('/loss', { params })
  return res.data.data
}

export const createLossRecord = async (payload: LossPayload): Promise<LossRecord> => {
  const res = await client.post<{ data: LossRecord }>('/loss', payload)
  return res.data.data
}
