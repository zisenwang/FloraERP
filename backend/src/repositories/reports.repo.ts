import pool from '@/db/pool'
import { rowsToCamel } from '@/utils/camel'
import type { RowDataPacket } from 'mysql2'
import type { SalesReportOrder, PurchaseReportOrder, InventoryReportRow } from '@/dto/reports.dto'

type SalesFilters = { startDate?: string; endDate?: string; customerId?: number }
type PurchaseFilters = { startDate?: string; endDate?: string; supplierId?: number }
type InventoryFilters = { category?: string; supplierId?: number }

export async function getSalesOrders(f: SalesFilters): Promise<SalesReportOrder[]> {
  let sql = `
    SELECT so.id, so.order_no, so.customer_id, c.name AS customer_name,
           DATE_FORMAT(so.date, '%Y-%m-%d') AS order_date,
           so.total_qty, so.total_amount, so.total_pieces, so.payment_status
    FROM sales_orders so JOIN customers c ON c.id = so.customer_id WHERE 1=1`
  const p: unknown[] = []
  if (f.startDate) {
    sql += ' AND so.date >= ?'
    p.push(f.startDate)
  }
  if (f.endDate) {
    sql += ' AND so.date <= ?'
    p.push(f.endDate)
  }
  if (f.customerId) {
    sql += ' AND so.customer_id = ?'
    p.push(f.customerId)
  }
  sql += ' ORDER BY so.date DESC, so.id DESC'
  const [rows] = await pool.query<RowDataPacket[]>(sql, p)
  return rowsToCamel<SalesReportOrder>(rows as Record<string, unknown>[])
}

export async function getSalesStats(
  f: SalesFilters,
): Promise<{ totalOrders: number; totalAmount: number; totalPieces: number }> {
  let sql = `SELECT COUNT(*) AS total_orders, COALESCE(SUM(total_amount), 0) AS total_amount,
             COALESCE(SUM(total_pieces), 0) AS total_pieces FROM sales_orders so WHERE 1=1`
  const p: unknown[] = []
  if (f.startDate) {
    sql += ' AND so.date >= ?'
    p.push(f.startDate)
  }
  if (f.endDate) {
    sql += ' AND so.date <= ?'
    p.push(f.endDate)
  }
  if (f.customerId) {
    sql += ' AND so.customer_id = ?'
    p.push(f.customerId)
  }
  const [rows] = await pool.query<RowDataPacket[]>(sql, p)
  const r = (rows as RowDataPacket[])[0]
  return {
    totalOrders: Number(r.total_orders),
    totalAmount: Number(r.total_amount),
    totalPieces: Number(r.total_pieces),
  }
}

export async function getSalesPaid(f: SalesFilters): Promise<number> {
  let sql = `SELECT COALESCE(SUM(p.amount), 0) AS total_paid
             FROM payments p JOIN sales_orders so ON so.id = p.sales_order_id WHERE 1=1`
  const p: unknown[] = []
  if (f.startDate) {
    sql += ' AND so.date >= ?'
    p.push(f.startDate)
  }
  if (f.endDate) {
    sql += ' AND so.date <= ?'
    p.push(f.endDate)
  }
  if (f.customerId) {
    sql += ' AND so.customer_id = ?'
    p.push(f.customerId)
  }
  const [rows] = await pool.query<RowDataPacket[]>(sql, p)
  return Number((rows as RowDataPacket[])[0]?.total_paid ?? 0)
}

export async function getPurchaseOrders(f: PurchaseFilters): Promise<PurchaseReportOrder[]> {
  let sql = `
    SELECT po.id, po.order_no, po.supplier_id, s.name AS supplier_name,
           DATE_FORMAT(po.date, '%Y-%m-%d') AS order_date,
           po.total_qty, po.total_amount, po.final_amount, po.status
    FROM purchase_orders po JOIN suppliers s ON s.id = po.supplier_id WHERE 1=1`
  const p: unknown[] = []
  if (f.startDate) {
    sql += ' AND po.date >= ?'
    p.push(f.startDate)
  }
  if (f.endDate) {
    sql += ' AND po.date <= ?'
    p.push(f.endDate)
  }
  if (f.supplierId) {
    sql += ' AND po.supplier_id = ?'
    p.push(f.supplierId)
  }
  sql += ' ORDER BY po.date DESC, po.id DESC'
  const [rows] = await pool.query<RowDataPacket[]>(sql, p)
  return rowsToCamel<PurchaseReportOrder>(rows as Record<string, unknown>[])
}

export async function getPurchaseStats(
  f: PurchaseFilters,
): Promise<{ totalOrders: number; totalAmount: number; totalQty: number }> {
  let sql = `SELECT COUNT(*) AS total_orders, COALESCE(SUM(total_amount), 0) AS total_amount,
             COALESCE(SUM(total_qty), 0) AS total_qty FROM purchase_orders po WHERE 1=1`
  const p: unknown[] = []
  if (f.startDate) {
    sql += ' AND po.date >= ?'
    p.push(f.startDate)
  }
  if (f.endDate) {
    sql += ' AND po.date <= ?'
    p.push(f.endDate)
  }
  if (f.supplierId) {
    sql += ' AND po.supplier_id = ?'
    p.push(f.supplierId)
  }
  const [rows] = await pool.query<RowDataPacket[]>(sql, p)
  const r = (rows as RowDataPacket[])[0]
  return {
    totalOrders: Number(r.total_orders),
    totalAmount: Number(r.total_amount),
    totalQty: Number(r.total_qty),
  }
}

export async function getInventoryRows(f: InventoryFilters): Promise<InventoryReportRow[]> {
  let sql = `
    SELECT p.id AS product_id, p.code AS product_code, p.name AS product_name,
           s.name AS supplier_name, p.category, p.unit,
           COALESCE(i.quantity, 0) AS stock, p.price
    FROM products p
    JOIN suppliers s ON s.id = p.supplier_id
    LEFT JOIN inventory i ON i.product_id = p.id
    WHERE p.status = 1`
  const p: unknown[] = []
  if (f.category) {
    sql += ' AND p.category = ?'
    p.push(f.category)
  }
  if (f.supplierId) {
    sql += ' AND p.supplier_id = ?'
    p.push(f.supplierId)
  }
  sql += ' ORDER BY p.code ASC'
  const [rows] = await pool.query<RowDataPacket[]>(sql, p)
  return rowsToCamel<InventoryReportRow>(rows as Record<string, unknown>[])
}
