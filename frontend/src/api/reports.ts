import client from './client'
import type { SalesOrder } from './sales'
import type { PurchaseOrder } from './purchase'
import type { InventoryItem } from './inventory'

export interface SalesReportData {
  total_orders: number
  total_amount: number
  total_paid: number
  total_unpaid: number
  orders: SalesOrder[]
}

export interface PurchaseReportData {
  total_orders: number
  total_amount: number
  total_paid: number
  total_unpaid: number
  orders: PurchaseOrder[]
}

export interface InventoryReportData {
  total_items: number
  low_stock_count: number
  low_stock_items: InventoryItem[]
  inventory: InventoryItem[]
}

export const getSalesReport = async (params?: {
  start_date?: string
  end_date?: string
  customer_id?: number
}): Promise<SalesReportData> => {
  const res = await client.get<{ data: SalesReportData }>('/reports/sales', { params })
  return res.data.data
}

export const getPurchaseReport = async (params?: {
  start_date?: string
  end_date?: string
  supplier_id?: number
}): Promise<PurchaseReportData> => {
  const res = await client.get<{ data: PurchaseReportData }>('/reports/purchase', { params })
  return res.data.data
}

export const getInventoryReport = async (params?: {
  category?: string
}): Promise<InventoryReportData> => {
  const res = await client.get<{ data: InventoryReportData }>('/reports/inventory', { params })
  return res.data.data
}
