import pool from '@/db/pool'
import * as repo from '@/repositories/product.repo'
import * as invRepo from '@/repositories/inventory.repo'
import type { Product, CreateProductDto, UpdateProductDto } from '@/dto/product.dto'
import { AppError } from '@/services/supplier.service'

export async function listProducts(
  filters: { supplierId?: number; search?: string } = {},
): Promise<Product[]> {
  return repo.findAll(filters)
}

export async function getProduct(id: number): Promise<Product> {
  const product = await repo.findById(id)
  if (!product) throw new AppError(404, '货品不存在')
  return product
}

export async function createProduct(dto: CreateProductDto): Promise<Product> {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const id = await repo.create(dto, conn)
    await invRepo.upsertInventoryRow(id, conn)
    await conn.commit()
    return getProduct(id)
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}

export async function updateProduct(id: number, dto: UpdateProductDto): Promise<Product> {
  const product = await repo.update(id, dto)
  if (!product) throw new AppError(404, '货品不存在')
  return product
}

export async function deleteProduct(id: number): Promise<void> {
  const ok = await repo.remove(id)
  if (!ok) throw new AppError(404, '货品不存在')
}
