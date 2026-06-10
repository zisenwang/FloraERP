import pool from '@/db/pool'
import { rowToCamel, rowsToCamel } from '@/utils/camel'
import type { PurchaseOrder, PurchaseOrderItem } from '@/dto/purchase.dto'
import type { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise'

const ORDER_SELECT = `
  SELECT po.id, po.order_no, po.supplier_id, s.name AS supplier_name, s.code AS supplier_code,
         s.phone AS supplier_phone,
         DATE_FORMAT(po.date, '%Y-%m-%d') AS order_date,
         po.total_qty, po.total_amount, po.discount, po.final_amount,
         po.operator, po.notes, po.status, po.created_at
  FROM purchase_orders po
  JOIN suppliers s ON s.id = po.supplier_id`

const ITEM_SELECT = `
  SELECT poi.id, poi.product_id, p.code AS product_code, p.name AS product_name,
         p.category, p.grade, p.unit, poi.qty, poi.unit_price, poi.amount,
         poi.discount, poi.final_amount, poi.notes
  FROM purchase_order_items poi
  JOIN products p ON p.id = poi.product_id
  WHERE poi.order_id = ?
  ORDER BY poi.id ASC`

export async function findAll(
  filters: {
    supplierId?: number
    startDate?: string
    endDate?: string
    search?: string
  } = {},
): Promise<PurchaseOrder[]> {
  let sql = ORDER_SELECT + ' WHERE 1=1'
  const params: unknown[] = []
  if (filters.supplierId) {
    sql += ' AND po.supplier_id = ?'
    params.push(filters.supplierId)
  }
  if (filters.startDate) {
    sql += ' AND po.date >= ?'
    params.push(filters.startDate)
  }
  if (filters.endDate) {
    sql += ' AND po.date <= ?'
    params.push(filters.endDate)
  }
  if (filters.search) {
    sql += ' AND (s.name LIKE ? OR s.code LIKE ? OR po.order_no LIKE ?)'
    params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`)
  }
  sql += ' ORDER BY po.date DESC, po.id DESC'
  const [rows] = await pool.query<RowDataPacket[]>(sql, params)
  return rowsToCamel<PurchaseOrder>(rows as Record<string, unknown>[])
}

export async function findById(id: number): Promise<PurchaseOrder | null> {
  const [rows] = await pool.query<RowDataPacket[]>(`${ORDER_SELECT} WHERE po.id = ?`, [id])
  if (!rows.length) return null
  const order = rowToCamel<PurchaseOrder>(rows[0] as Record<string, unknown>)
  const [itemRows] = await pool.query<RowDataPacket[]>(ITEM_SELECT, [id])
  order.items = rowsToCamel<PurchaseOrderItem>(itemRows as Record<string, unknown>[])
  return order
}

export async function insertOrder(
  data: {
    supplierId: number
    date: string
    totalQty: number
    totalAmount: number
    discount: number
    finalAmount: number
    operator: string | null
    notes: string | null
  },
  conn: PoolConnection,
): Promise<number> {
  const [result] = await conn.query<ResultSetHeader>(
    `INSERT INTO purchase_orders
       (order_no, supplier_id, date, total_qty, total_amount, discount, final_amount, operator, notes)
     VALUES ('PENDING', ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.supplierId,
      data.date,
      data.totalQty,
      data.totalAmount,
      data.discount,
      data.finalAmount,
      data.operator,
      data.notes,
    ],
  )
  return result.insertId
}

export async function setOrderNo(id: number, orderNo: string, conn: PoolConnection): Promise<void> {
  await conn.query('UPDATE purchase_orders SET order_no = ? WHERE id = ?', [orderNo, id])
}

export async function updateOrderTotals(
  id: number,
  data: {
    supplierId: number
    date: string
    totalQty: number
    totalAmount: number
    discount: number
    finalAmount: number
    notes: string | null
  },
  conn: PoolConnection,
): Promise<void> {
  await conn.query(
    `UPDATE purchase_orders
     SET supplier_id=?, date=?, total_qty=?, total_amount=?, discount=?, final_amount=?, notes=?
     WHERE id=?`,
    [
      data.supplierId,
      data.date,
      data.totalQty,
      data.totalAmount,
      data.discount,
      data.finalAmount,
      data.notes,
      id,
    ],
  )
}

export async function insertItem(
  orderId: number,
  item: {
    productId: number
    qty: number
    unitPrice: number
    amount: number
    discount: number
    finalAmount: number
    notes: string | null
  },
  conn: PoolConnection,
): Promise<void> {
  await conn.query(
    `INSERT INTO purchase_order_items
       (order_id, product_id, qty, unit_price, amount, discount, final_amount, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [orderId, item.productId, item.qty, item.unitPrice, item.amount, item.discount, item.finalAmount, item.notes],
  )
}

export async function deleteItems(
  orderId: number,
  conn: PoolConnection,
): Promise<{ productId: number; qty: number }[]> {
  const [rows] = await conn.query<RowDataPacket[]>(
    'SELECT product_id, qty FROM purchase_order_items WHERE order_id = ?',
    [orderId],
  )
  await conn.query('DELETE FROM purchase_order_items WHERE order_id = ?', [orderId])
  return (rows as RowDataPacket[]).map((r) => ({
    productId: r.product_id as number,
    qty: r.qty as number,
  }))
}
