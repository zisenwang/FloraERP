import pool from '@/db/pool'
import { rowToCamel, rowsToCamel } from '@/utils/camel'
import type { SalesOrder, SalesOrderItem } from '@/dto/sales.dto'
import type { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise'

const ORDER_SELECT = `
  SELECT so.id, so.order_no, so.customer_id, c.name AS customer_name, c.code AS customer_code,
         c.phone AS customer_phone, c.address AS customer_address,
         DATE_FORMAT(so.date, '%Y-%m-%d') AS order_date,
         so.total_qty, so.total_amount, so.total_pieces,
         so.payment_status, so.operator, so.notes, so.status,
         so.created_at
  FROM sales_orders so
  JOIN customers c ON c.id = so.customer_id`

// Used for list queries — includes per-order profit aggregated from items
const ORDER_SELECT_LIST = `
  SELECT so.id, so.order_no, so.customer_id, c.name AS customer_name, c.code AS customer_code,
         c.phone AS customer_phone, c.address AS customer_address,
         DATE_FORMAT(so.date, '%Y-%m-%d') AS order_date,
         so.total_qty, so.total_amount, so.total_pieces,
         so.payment_status, so.operator, so.notes, so.status, so.created_at,
         COALESCE(SUM(soi.final_amount - COALESCE(soi.cost_price, 0) * soi.qty), 0) AS total_profit
  FROM sales_orders so
  JOIN customers c ON c.id = so.customer_id
  LEFT JOIN sales_order_items soi ON soi.order_id = so.id`

const ITEM_SELECT = `
  SELECT soi.id, soi.product_id, CONCAT(s.code, '.', p.code) AS product_code, p.name AS product_name,
         soi.supplier_id, s.code AS supplier_code, s.name AS supplier_name,
         p.unit, soi.qty, soi.unit_price, soi.amount,
         soi.discount, soi.final_amount, soi.cost_price, soi.pieces, soi.notes
  FROM sales_order_items soi
  JOIN products p ON p.id = soi.product_id
  JOIN suppliers s ON s.id = soi.supplier_id
  WHERE soi.order_id = ?
  ORDER BY soi.id ASC`

export async function findAll(
  filters: {
    customerId?: number
    paymentStatus?: string
    startDate?: string
    endDate?: string
    search?: string
  } = {},
): Promise<SalesOrder[]> {
  let sql = ORDER_SELECT_LIST + ' WHERE 1=1'
  const params: unknown[] = []
  if (filters.customerId) {
    sql += ' AND so.customer_id = ?'
    params.push(filters.customerId)
  }
  if (filters.paymentStatus) {
    sql += ' AND so.payment_status = ?'
    params.push(filters.paymentStatus)
  }
  if (filters.startDate) {
    sql += ' AND so.date >= ?'
    params.push(filters.startDate)
  }
  if (filters.endDate) {
    sql += ' AND so.date <= ?'
    params.push(filters.endDate)
  }
  if (filters.search) {
    sql += ` AND (c.name LIKE ? OR c.code LIKE ? OR so.order_no LIKE ?
      OR EXISTS (
        SELECT 1 FROM sales_order_items soi2
        JOIN products p2 ON p2.id = soi2.product_id
        WHERE soi2.order_id = so.id AND (p2.name LIKE ? OR p2.code LIKE ?)
      ))`
    params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`)
  }
  sql += ' GROUP BY so.id, so.order_no, so.customer_id, c.name, c.code, c.phone, c.address, so.date, so.total_qty, so.total_amount, so.total_pieces, so.payment_status, so.operator, so.notes, so.status, so.created_at'
  sql += ' ORDER BY so.date DESC, so.id DESC'
  const [rows] = await pool.query<RowDataPacket[]>(sql, params)
  return rowsToCamel<SalesOrder>(rows as Record<string, unknown>[])
}

export async function findById(id: number): Promise<SalesOrder | null> {
  const [rows] = await pool.query<RowDataPacket[]>(`${ORDER_SELECT} WHERE so.id = ?`, [id])
  if (!rows.length) return null
  const order = rowToCamel<SalesOrder>(rows[0] as Record<string, unknown>)
  const [itemRows] = await pool.query<RowDataPacket[]>(ITEM_SELECT, [id])
  order.items = rowsToCamel<SalesOrderItem>(itemRows as Record<string, unknown>[])
  order.totalProfit = +order.items
    .reduce((s, i) => s + i.finalAmount - (i.costPrice ?? 0) * i.qty, 0)
    .toFixed(2)
  return order
}

export async function insertOrder(
  data: {
    customerId: number
    date: string
    totalQty: number
    totalAmount: number
    totalPieces: number
    operator: string | null
    notes: string | null
  },
  conn: PoolConnection,
): Promise<number> {
  const [result] = await conn.query<ResultSetHeader>(
    `INSERT INTO sales_orders
       (order_no, customer_id, date, total_qty, total_amount, total_pieces, operator, notes)
     VALUES ('PENDING', ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.customerId,
      data.date,
      data.totalQty,
      data.totalAmount,
      data.totalPieces,
      data.operator,
      data.notes,
    ],
  )
  return result.insertId
}

export async function setOrderNo(id: number, orderNo: string, conn: PoolConnection): Promise<void> {
  await conn.query('UPDATE sales_orders SET order_no = ? WHERE id = ?', [orderNo, id])
}

export async function countByDate(date: string, id: number, conn: PoolConnection): Promise<number> {
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(order_no, '_D', -1) AS UNSIGNED)), 0) + 1 AS next_seq
     FROM sales_orders WHERE date = ? AND id != ? AND order_no != 'PENDING'`,
    [date, id],
  )
  return Number((rows as RowDataPacket[])[0].next_seq)
}

export async function updateOrderTotals(
  id: number,
  data: {
    customerId: number
    date: string
    totalQty: number
    totalAmount: number
    totalPieces: number
    notes: string | null
  },
  conn: PoolConnection,
): Promise<void> {
  await conn.query(
    `UPDATE sales_orders
     SET customer_id=?, date=?, total_qty=?, total_amount=?, total_pieces=?, notes=?
     WHERE id=?`,
    [data.customerId, data.date, data.totalQty, data.totalAmount, data.totalPieces, data.notes, id],
  )
}

export async function insertItem(
  orderId: number,
  item: {
    productId: number
    supplierId: number
    qty: number
    unitPrice: number
    amount: number
    discount: number
    finalAmount: number
    costPrice: number | null
    pieces: number
    notes: string | null
  },
  conn: PoolConnection,
): Promise<void> {
  await conn.query(
    `INSERT INTO sales_order_items
       (order_id, product_id, supplier_id, qty, unit_price, amount, discount, final_amount, cost_price, pieces, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      orderId,
      item.productId,
      item.supplierId,
      item.qty,
      item.unitPrice,
      item.amount,
      item.discount,
      item.finalAmount,
      item.costPrice ?? null,
      item.pieces,
      item.notes,
    ],
  )
}

export async function deleteItems(
  orderId: number,
  conn: PoolConnection,
): Promise<{ productId: number; qty: number }[]> {
  const [rows] = await conn.query<RowDataPacket[]>(
    'SELECT product_id, qty FROM sales_order_items WHERE order_id = ?',
    [orderId],
  )
  await conn.query('DELETE FROM sales_order_items WHERE order_id = ?', [orderId])
  return (rows as RowDataPacket[]).map((r) => ({
    productId: r.product_id as number,
    qty: r.qty as number,
  }))
}

export async function findOrderForPayment(
  id: number,
  conn: PoolConnection,
): Promise<{ customerId: number; totalAmount: number } | null> {
  const [rows] = await conn.query<RowDataPacket[]>(
    'SELECT customer_id, total_amount FROM sales_orders WHERE id = ?',
    [id],
  )
  if (!(rows as RowDataPacket[]).length) return null
  const r = (rows as RowDataPacket[])[0]
  return { customerId: r.customer_id as number, totalAmount: Number(r.total_amount) }
}

export async function findPaymentStatus(id: number): Promise<string | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT payment_status FROM sales_orders WHERE id = ?',
    [id],
  )
  return ((rows as RowDataPacket[])[0]?.payment_status as string) ?? null
}

export async function updatePaymentStatus(
  orderId: number,
  status: '未收款' | '已收款' | '部分收款',
  conn: PoolConnection,
): Promise<void> {
  await conn.query('UPDATE sales_orders SET payment_status = ? WHERE id = ?', [status, orderId])
}
