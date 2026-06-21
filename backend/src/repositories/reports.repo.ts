import pool from '@/db/pool'
import { rowsToCamel } from '@/utils/camel'
import type { RowDataPacket } from 'mysql2'
import type { SalesReportOrder, PurchaseReportOrder, InventoryReportRow, ReportGroupRow, ReportOrderRow } from '@/dto/reports.dto'

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

export async function getSalesProfit(f: SalesFilters): Promise<number> {
  let sql = `SELECT COALESCE(SUM(soi.final_amount - COALESCE(soi.cost_price, 0) * soi.qty), 0) AS total_profit
             FROM sales_order_items soi
             JOIN sales_orders so ON so.id = soi.order_id WHERE 1=1`
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
  return Number((rows as RowDataPacket[])[0]?.total_profit ?? 0)
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
    SELECT p.id AS product_id, CONCAT(s.code, '.', p.code) AS product_code, p.name AS product_name,
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
  sql += ' ORDER BY s.code ASC, p.code ASC'
  const [rows] = await pool.query<RowDataPacket[]>(sql, p)
  return rowsToCamel<InventoryReportRow>(rows as Record<string, unknown>[])
}

// ── Sales aggregated queries ──────────────────────────────────────────────────

type DateFilter = { startDate: string; endDate: string }

export async function getSalesL1(
  by: 'customer' | 'product' | 'supplier',
  f: DateFilter,
): Promise<ReportGroupRow[]> {
  let sql: string
  if (by === 'customer') {
    sql = `
      SELECT c.id, CONCAT(c.code, ' ', c.name) AS name,
             COUNT(DISTINCT so.id) AS order_count,
             SUM(soi.qty) AS total_qty, SUM(soi.pieces) AS total_pieces,
             SUM(soi.final_amount) AS total_amount,
             SUM(soi.final_amount - COALESCE(soi.cost_price, 0) * soi.qty) AS total_profit
      FROM sales_order_items soi
      JOIN sales_orders so ON so.id = soi.order_id
      JOIN customers c ON c.id = so.customer_id
      WHERE so.date BETWEEN ? AND ?
      GROUP BY c.id, c.code, c.name
      ORDER BY total_amount DESC`
  } else if (by === 'product') {
    sql = `
      SELECT p.id, CONCAT(s.code, '.', p.code, ' ', p.name) AS name, p.unit,
             COUNT(DISTINCT so.id) AS order_count,
             SUM(soi.qty) AS total_qty, SUM(soi.pieces) AS total_pieces,
             SUM(soi.final_amount) AS total_amount,
             SUM(soi.final_amount - COALESCE(soi.cost_price, 0) * soi.qty) AS total_profit
      FROM sales_order_items soi
      JOIN sales_orders so ON so.id = soi.order_id
      JOIN products p ON p.id = soi.product_id
      JOIN suppliers s ON s.id = p.supplier_id
      WHERE so.date BETWEEN ? AND ?
      GROUP BY p.id, s.code, p.code, p.name, p.unit
      ORDER BY total_amount DESC`
  } else {
    sql = `
      SELECT s.id, CONCAT(s.code, ' ', s.name) AS name,
             COUNT(DISTINCT so.id) AS order_count,
             SUM(soi.qty) AS total_qty, SUM(soi.pieces) AS total_pieces,
             SUM(soi.final_amount) AS total_amount,
             SUM(soi.final_amount - COALESCE(soi.cost_price, 0) * soi.qty) AS total_profit
      FROM sales_order_items soi
      JOIN sales_orders so ON so.id = soi.order_id
      JOIN suppliers s ON s.id = soi.supplier_id
      WHERE so.date BETWEEN ? AND ?
      GROUP BY s.id, s.code, s.name
      ORDER BY total_amount DESC`
  }
  const [rows] = await pool.query<RowDataPacket[]>(sql, [f.startDate, f.endDate])
  return rowsToCamel<ReportGroupRow>(rows as Record<string, unknown>[])
}

export async function getSalesL2(
  by: 'customer' | 'product' | 'supplier',
  parentId: number,
  f: DateFilter,
): Promise<ReportGroupRow[]> {
  let sql: string
  let params: unknown[]
  if (by === 'customer') {
    // parent = customer → show products
    sql = `
      SELECT p.id, CONCAT(s.code, '.', p.code, ' ', p.name) AS name, p.unit,
             COUNT(DISTINCT so.id) AS order_count,
             SUM(soi.qty) AS total_qty, SUM(soi.pieces) AS total_pieces,
             SUM(soi.final_amount) AS total_amount,
             SUM(soi.final_amount - COALESCE(soi.cost_price, 0) * soi.qty) AS total_profit
      FROM sales_order_items soi
      JOIN sales_orders so ON so.id = soi.order_id
      JOIN products p ON p.id = soi.product_id
      JOIN suppliers s ON s.id = p.supplier_id
      WHERE so.date BETWEEN ? AND ? AND so.customer_id = ?
      GROUP BY p.id, s.code, p.code, p.name, p.unit
      ORDER BY total_amount DESC`
    params = [f.startDate, f.endDate, parentId]
  } else if (by === 'product') {
    // parent = product → show customers
    sql = `
      SELECT c.id, CONCAT(c.code, ' ', c.name) AS name,
             COUNT(DISTINCT so.id) AS order_count,
             SUM(soi.qty) AS total_qty, SUM(soi.pieces) AS total_pieces,
             SUM(soi.final_amount) AS total_amount,
             SUM(soi.final_amount - COALESCE(soi.cost_price, 0) * soi.qty) AS total_profit
      FROM sales_order_items soi
      JOIN sales_orders so ON so.id = soi.order_id
      JOIN customers c ON c.id = so.customer_id
      WHERE so.date BETWEEN ? AND ? AND soi.product_id = ?
      GROUP BY c.id, c.code, c.name
      ORDER BY total_amount DESC`
    params = [f.startDate, f.endDate, parentId]
  } else {
    // parent = supplier → show products
    sql = `
      SELECT p.id, CONCAT(s.code, '.', p.code, ' ', p.name) AS name, p.unit,
             COUNT(DISTINCT so.id) AS order_count,
             SUM(soi.qty) AS total_qty, SUM(soi.pieces) AS total_pieces,
             SUM(soi.final_amount) AS total_amount,
             SUM(soi.final_amount - COALESCE(soi.cost_price, 0) * soi.qty) AS total_profit
      FROM sales_order_items soi
      JOIN sales_orders so ON so.id = soi.order_id
      JOIN products p ON p.id = soi.product_id
      JOIN suppliers s ON s.id = soi.supplier_id
      WHERE so.date BETWEEN ? AND ? AND soi.supplier_id = ?
      GROUP BY p.id, s.code, p.code, p.name, p.unit
      ORDER BY total_amount DESC`
    params = [f.startDate, f.endDate, parentId]
  }
  const [rows] = await pool.query<RowDataPacket[]>(sql, params)
  return rowsToCamel<ReportGroupRow>(rows as Record<string, unknown>[])
}

export async function getSalesL3(
  f: DateFilter & { customerId?: number; productId?: number; supplierId?: number },
): Promise<ReportOrderRow[]> {
  let sql = `
    SELECT so.id AS order_id, so.order_no, DATE_FORMAT(so.date, '%Y-%m-%d') AS order_date,
           CONCAT(c.code, ' ', c.name) AS customer_name,
           CONCAT(s.code, '.', p.code) AS product_code, p.name AS product_name,
           s.code AS supplier_code, CONCAT(s.code, ' ', s.name) AS supplier_name,
           soi.qty, soi.pieces, soi.unit_price, soi.amount, soi.discount, soi.final_amount,
           soi.cost_price, soi.notes,
           (soi.final_amount - COALESCE(soi.cost_price, 0) * soi.qty) AS profit
    FROM sales_order_items soi
    JOIN sales_orders so ON so.id = soi.order_id
    JOIN customers c ON c.id = so.customer_id
    JOIN products p ON p.id = soi.product_id
    JOIN suppliers s ON s.id = soi.supplier_id
    WHERE so.date BETWEEN ? AND ?`
  const params: unknown[] = [f.startDate, f.endDate]
  if (f.customerId) { sql += ' AND so.customer_id = ?'; params.push(f.customerId) }
  if (f.productId)  { sql += ' AND soi.product_id = ?'; params.push(f.productId) }
  if (f.supplierId) { sql += ' AND soi.supplier_id = ?'; params.push(f.supplierId) }
  sql += ' ORDER BY so.date DESC, so.id DESC'
  const [rows] = await pool.query<RowDataPacket[]>(sql, params)
  return rowsToCamel<ReportOrderRow>(rows as Record<string, unknown>[])
}

// ── Purchase aggregated queries ───────────────────────────────────────────────

export async function getPurchaseL1(
  by: 'supplier' | 'product',
  f: DateFilter,
): Promise<ReportGroupRow[]> {
  let sql: string
  if (by === 'supplier') {
    sql = `
      SELECT s.id, CONCAT(s.code, ' ', s.name) AS name,
             COUNT(DISTINCT po.id) AS order_count,
             SUM(poi.qty) AS total_qty, SUM(poi.pieces) AS total_pieces,
             SUM(poi.final_amount) AS total_amount
      FROM purchase_order_items poi
      JOIN purchase_orders po ON po.id = poi.order_id
      JOIN suppliers s ON s.id = po.supplier_id
      WHERE po.date BETWEEN ? AND ?
      GROUP BY s.id, s.code, s.name
      ORDER BY total_amount DESC`
  } else {
    sql = `
      SELECT p.id, CONCAT(s.code, '.', p.code, ' ', p.name) AS name, p.unit,
             COUNT(DISTINCT po.id) AS order_count,
             SUM(poi.qty) AS total_qty, SUM(poi.pieces) AS total_pieces,
             SUM(poi.final_amount) AS total_amount
      FROM purchase_order_items poi
      JOIN purchase_orders po ON po.id = poi.order_id
      JOIN products p ON p.id = poi.product_id
      JOIN suppliers s ON s.id = p.supplier_id
      WHERE po.date BETWEEN ? AND ?
      GROUP BY p.id, s.code, p.code, p.name, p.unit
      ORDER BY total_amount DESC`
  }
  const [rows] = await pool.query<RowDataPacket[]>(sql, [f.startDate, f.endDate])
  return rowsToCamel<ReportGroupRow>(rows as Record<string, unknown>[])
}

export async function getPurchaseL2(
  by: 'supplier' | 'product',
  parentId: number,
  f: DateFilter,
): Promise<ReportGroupRow[]> {
  let sql: string
  let params: unknown[]
  if (by === 'supplier') {
    // parent = supplier → show products
    sql = `
      SELECT p.id, CONCAT(s.code, '.', p.code, ' ', p.name) AS name, p.unit,
             COUNT(DISTINCT po.id) AS order_count,
             SUM(poi.qty) AS total_qty, SUM(poi.pieces) AS total_pieces,
             SUM(poi.final_amount) AS total_amount
      FROM purchase_order_items poi
      JOIN purchase_orders po ON po.id = poi.order_id
      JOIN products p ON p.id = poi.product_id
      JOIN suppliers s ON s.id = po.supplier_id
      WHERE po.date BETWEEN ? AND ? AND po.supplier_id = ?
      GROUP BY p.id, s.code, p.code, p.name, p.unit
      ORDER BY total_amount DESC`
    params = [f.startDate, f.endDate, parentId]
  } else {
    // parent = product → show suppliers
    sql = `
      SELECT s.id, CONCAT(s.code, ' ', s.name) AS name,
             COUNT(DISTINCT po.id) AS order_count,
             SUM(poi.qty) AS total_qty, SUM(poi.pieces) AS total_pieces,
             SUM(poi.final_amount) AS total_amount
      FROM purchase_order_items poi
      JOIN purchase_orders po ON po.id = poi.order_id
      JOIN suppliers s ON s.id = po.supplier_id
      WHERE po.date BETWEEN ? AND ? AND poi.product_id = ?
      GROUP BY s.id, s.code, s.name
      ORDER BY total_amount DESC`
    params = [f.startDate, f.endDate, parentId]
  }
  const [rows] = await pool.query<RowDataPacket[]>(sql, params)
  return rowsToCamel<ReportGroupRow>(rows as Record<string, unknown>[])
}

export async function getPurchaseL3(
  f: DateFilter & { supplierId?: number; productId?: number },
): Promise<ReportOrderRow[]> {
  let sql = `
    SELECT po.id AS order_id, po.order_no, DATE_FORMAT(po.date, '%Y-%m-%d') AS order_date,
           CONCAT(s.code, ' ', s.name) AS supplier_name,
           CONCAT(s.code, '.', p.code) AS product_code, p.name AS product_name,
           poi.qty, poi.pieces, poi.unit_price, poi.amount, poi.discount, poi.final_amount
    FROM purchase_order_items poi
    JOIN purchase_orders po ON po.id = poi.order_id
    JOIN suppliers s ON s.id = po.supplier_id
    JOIN products p ON p.id = poi.product_id
    WHERE po.date BETWEEN ? AND ?`
  const params: unknown[] = [f.startDate, f.endDate]
  if (f.supplierId) { sql += ' AND po.supplier_id = ?'; params.push(f.supplierId) }
  if (f.productId)  { sql += ' AND poi.product_id = ?'; params.push(f.productId) }
  sql += ' ORDER BY po.date DESC, po.id DESC'
  const [rows] = await pool.query<RowDataPacket[]>(sql, params)
  return rowsToCamel<ReportOrderRow>(rows as Record<string, unknown>[])
}
