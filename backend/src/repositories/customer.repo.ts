import pool from '@/db/pool'
import { rowToCamel, rowsToCamel } from '@/utils/camel'
import type { Customer, CreateCustomerDto, UpdateCustomerDto } from '@/dto/customer.dto'
import type { RowDataPacket, ResultSetHeader } from 'mysql2'
import { AppError } from '@/services/supplier.service'

const SELECT = `SELECT id, code, name, contact, phone, city, address, level, status FROM customers`

export async function findAll(search?: string): Promise<Customer[]> {
  let sql = SELECT
  const params: unknown[] = []
  if (search) {
    sql += ' WHERE name LIKE ? OR code LIKE ?'
    params.push(`%${search}%`, `%${search}%`)
  }
  sql += ' ORDER BY code ASC'
  const [rows] = await pool.query<RowDataPacket[]>(sql, params)
  return rowsToCamel<Customer>(rows as Record<string, unknown>[])
}

export async function findById(id: number): Promise<Customer | null> {
  const [rows] = await pool.query<RowDataPacket[]>(`${SELECT}, notes WHERE id = ?`, [id])
  return rows.length ? rowToCamel<Customer>(rows[0] as Record<string, unknown>) : null
}

export async function create(dto: CreateCustomerDto): Promise<Customer> {
  try {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO customers (code, name, contact, phone, city, address, level) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        dto.code,
        dto.name,
        dto.contact ?? null,
        dto.phone ?? null,
        dto.city ?? null,
        dto.address ?? null,
        dto.level ?? null,
      ],
    )
    return findById(result.insertId) as Promise<Customer>
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') throw new AppError(409, '客户编码已存在')
    throw err
  }
}

export async function update(id: number, dto: UpdateCustomerDto): Promise<Customer | null> {
  try {
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE customers SET code=?, name=?, contact=?, phone=?, city=?, address=?, level=?, status=? WHERE id=?',
      [
        dto.code,
        dto.name,
        dto.contact ?? null,
        dto.phone ?? null,
        dto.city ?? null,
        dto.address ?? null,
        dto.level ?? null,
        dto.status ?? 1,
        id,
      ],
    )
    if (result.affectedRows === 0) return null
    return findById(id)
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') throw new AppError(409, '客户编码已存在')
    throw err
  }
}

export async function remove(id: number): Promise<boolean> {
  try {
    const [result] = await pool.query<ResultSetHeader>('DELETE FROM customers WHERE id = ?', [id])
    return result.affectedRows > 0
  } catch (err: any) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') throw new AppError(409, '该客户有关联数据，无法删除')
    throw err
  }
}
