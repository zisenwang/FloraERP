import client from './client'

export interface InventoryItem {
  id: number
  product_id: number
  product_code: string
  product_name: string
  supplier_name: string
  category: string
  unit: string
  stock: number
  alert_stock: number
  last_updated: string
}

export interface InventoryAdjustment {
  id: number
  product_code: string
  product_name: string
  adjust_type: string   // 盘盈 | 盘亏
  qty: number
  reason: string
  operator: string
  created_at: string
}

export interface AdjustPayload {
  product_code: string
  product_name: string
  adjust_type: string
  qty: number
  reason: string
}

export const getInventory = async (params?: {
  search?: string
  category?: string
}): Promise<InventoryItem[]> => {
  const res = await client.get<{ data: InventoryItem[] }>('/inventory', { params })
  return res.data.data
}

export const getAdjustments = async (): Promise<InventoryAdjustment[]> => {
  const res = await client.get<{ data: InventoryAdjustment[] }>('/inventory/adjustments')
  return res.data.data
}

export const createAdjustment = async (payload: AdjustPayload): Promise<InventoryAdjustment> => {
  const res = await client.post<{ data: InventoryAdjustment }>('/inventory/adjust', payload)
  return res.data.data
}
