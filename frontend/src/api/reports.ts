import client from './client'
import type { SalesOrder } from './sales'
import type { PurchaseOrder } from './purchase'

export interface InventoryReportItem {
  productId: number
  productCode: string
  productName: string
  supplierName: string
  category: string
  unit: string
  stock: number
  price: number
}

export interface SalesReportData {
  totalOrders: number
  totalAmount: number
  totalPieces: number
  totalPaid: number
  totalUnpaid: number
  orders: SalesOrder[]
}

export interface PurchaseReportData {
  totalOrders: number
  totalAmount: number
  totalQty: number
  orders: PurchaseOrder[]
}

export interface InventoryReportData {
  totalItems: number
  totalStock: number
  inventory: InventoryReportItem[]
}

export const getSalesReport = async (params?: {
  startDate?: string
  endDate?: string
  customerId?: number
}): Promise<SalesReportData> => {
  const res = await client.get<{ data: SalesReportData }>('/reports/sales', { params })
  return res.data.data
}

export const getPurchaseReport = async (params?: {
  startDate?: string
  endDate?: string
  supplierId?: number
}): Promise<PurchaseReportData> => {
  const res = await client.get<{ data: PurchaseReportData }>('/reports/purchase', { params })
  return res.data.data
}

export const getInventoryReport = async (params?: {
  category?: string
  supplierId?: number
}): Promise<InventoryReportData> => {
  const res = await client.get<{ data: InventoryReportData }>('/reports/inventory', { params })
  return res.data.data
}
