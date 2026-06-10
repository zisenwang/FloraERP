import pool from '@/db/pool'
import { rowsToCamel } from '@/utils/camel'
import type { RowDataPacket } from 'mysql2'
import type { SalesRankRow, PurchaseSupplierRankRow, PurchaseProductRankRow } from '@/dto/dashboard.dto'

export async function getTodayStats(today: string): Promise<{
  todaySales: number
  todayIncome: number
  todayPurchase: number
  todayOrderCount: number
}> {
  const [[salesRows], [incomeRows], [purchaseRows], [orderRows]] = await Promise.all([
    pool.query<RowDataPacket[]>(
      'SELECT COALESCE(SUM(total_amount), 0) AS val FROM sales_orders WHERE date = ?',
      [today],
    ),
    pool.query<RowDataPacket[]>(
      'SELECT COALESCE(SUM(amount), 0) AS val FROM payments WHERE payment_date = ?',
      [today],
    ),
    pool.query<RowDataPacket[]>(
      'SELECT COALESCE(SUM(final_amount), 0) AS val FROM purchase_orders WHERE date = ?',
      [today],
    ),
    pool.query<RowDataPacket[]>('SELECT COUNT(*) AS val FROM sales_orders WHERE date = ?', [today]),
  ])
  return {
    todaySales: Number((salesRows as RowDataPacket[])[0]?.val ?? 0),
    todayIncome: Number((incomeRows as RowDataPacket[])[0]?.val ?? 0),
    todayPurchase: Number((purchaseRows as RowDataPacket[])[0]?.val ?? 0),
    todayOrderCount: Number((orderRows as RowDataPacket[])[0]?.val ?? 0),
  }
}

export async function getMonthlySalesRank(monthStart: string): Promise<SalesRankRow[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT c.code AS customer_code, c.name AS customer_name,
            SUM(so.total_amount) AS total_amount, SUM(so.total_pieces) AS total_pieces
     FROM sales_orders so JOIN customers c ON c.id = so.customer_id
     WHERE so.date >= ?
     GROUP BY so.customer_id, c.code, c.name
     ORDER BY total_amount DESC LIMIT 10`,
    [monthStart],
  )
  return rowsToCamel<SalesRankRow>(rows as Record<string, unknown>[])
}

export async function getMonthlyPurchaseSupplierRank(monthStart: string): Promise<PurchaseSupplierRankRow[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT s.code AS supplier_code, s.name AS supplier_name, SUM(poi.qty) AS total_qty
     FROM purchase_order_items poi
     JOIN purchase_orders po ON po.id = poi.order_id
     JOIN suppliers s ON s.id = po.supplier_id
     WHERE po.date >= ?
     GROUP BY po.supplier_id, s.code, s.name
     ORDER BY total_qty DESC LIMIT 10`,
    [monthStart],
  )
  return rowsToCamel<PurchaseSupplierRankRow>(rows as Record<string, unknown>[])
}

export async function getMonthlyPurchaseProductRank(monthStart: string): Promise<PurchaseProductRankRow[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT p.code AS product_code, p.name AS product_name,
            s.code AS supplier_code, s.name AS supplier_name,
            SUM(poi.qty) AS total_qty
     FROM purchase_order_items poi
     JOIN purchase_orders po ON po.id = poi.order_id
     JOIN products p ON p.id = poi.product_id
     JOIN suppliers s ON s.id = p.supplier_id
     WHERE po.date >= ?
     GROUP BY poi.product_id, p.code, p.name, s.code, s.name
     ORDER BY total_qty DESC LIMIT 10`,
    [monthStart],
  )
  return rowsToCamel<PurchaseProductRankRow>(rows as Record<string, unknown>[])
}
