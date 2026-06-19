import pool from '@/db/pool'
import * as repo from '@/repositories/sales-return.repo'
import * as invRepo from '@/repositories/inventory.repo'
import { genSalesReturnNo } from '@/utils/orderNo'
import { AppError } from '@/services/supplier.service'
import type { SalesReturn, CreateSalesReturnDto, UpdateSalesReturnDto } from '@/dto/sales-return.dto'

function computeTotals(items: CreateSalesReturnDto['items']) {
  let totalQty = 0, totalPieces = 0, totalAmount = 0
  const lines = items.map(item => {
    const amount = +(item.qty * item.unitPrice).toFixed(2)
    totalQty += item.qty
    totalPieces += item.pieces ?? 0
    totalAmount += amount
    return { ...item, amount, pieces: item.pieces ?? 0 }
  })
  return { lines, totalQty, totalPieces, totalAmount: +totalAmount.toFixed(2) }
}

export async function listReturns(filters: Parameters<typeof repo.findAll>[0]): Promise<SalesReturn[]> {
  return repo.findAll(filters)
}

export async function getReturn(id: number): Promise<SalesReturn> {
  const ret = await repo.findById(id)
  if (!ret) throw new AppError(404, '销售退货单不存在')
  return ret
}

export async function createReturn(dto: CreateSalesReturnDto, operator: string | null): Promise<SalesReturn> {
  const { lines, totalQty, totalPieces, totalAmount } = computeTotals(dto.items)
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const returnId = await repo.insertReturn({
      customerId: dto.customerId,
      originalOrderId: dto.originalOrderId ?? null,
      date: dto.returnDate,
      totalQty,
      totalPieces,
      totalAmount,
      operator,
      notes: dto.notes ?? null,
    }, conn)
    await repo.setReturnNo(returnId, genSalesReturnNo(returnId, new Date(dto.returnDate)), conn)
    for (const line of lines) {
      await repo.insertItem(returnId, {
        productId: line.productId,
        qty: line.qty,
        pieces: line.pieces,
        unitPrice: line.unitPrice,
        amount: line.amount,
        notes: line.notes ?? null,
      }, conn)
      // Sales return: customer returns goods to us → increase inventory
      const qtyBefore = await invRepo.getQuantity(line.productId, conn)
      await invRepo.incrementQuantity(line.productId, line.qty, conn)
      await invRepo.logAdjustment({
        productId: line.productId,
        type: 'in',
        qtyBefore,
        qtyChange: line.qty,
        qtyAfter: qtyBefore + line.qty,
        refType: 'sales_return',
        refId: returnId,
        operator: operator ?? undefined,
      }, conn)
    }
    await conn.commit()
    return getReturn(returnId)
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}

export async function deleteReturn(id: number): Promise<void> {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const ret = await repo.findById(id)
    if (!ret) throw new AppError(404, '销售退货单不存在')
    const oldItems = await repo.deleteItems(id, conn)
    // Reverse the return: remove inventory that was added
    for (const old of oldItems) {
      await invRepo.incrementQuantity(old.productId, -old.qty, conn)
    }
    await conn.query('DELETE FROM sales_returns WHERE id = ?', [id])
    await conn.commit()
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}

export async function updateReturn(id: number, dto: UpdateSalesReturnDto): Promise<SalesReturn> {
  const { lines, totalQty, totalPieces, totalAmount } = computeTotals(dto.items)
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const oldItems = await repo.deleteItems(id, conn)
    // Reverse old return's inventory effect
    for (const old of oldItems) {
      await invRepo.incrementQuantity(old.productId, -old.qty, conn)
    }
    await repo.updateReturnTotals(id, {
      customerId: dto.customerId,
      originalOrderId: dto.originalOrderId ?? null,
      date: dto.returnDate,
      totalQty,
      totalPieces,
      totalAmount,
      notes: dto.notes ?? null,
    }, conn)
    for (const line of lines) {
      await repo.insertItem(id, {
        productId: line.productId,
        qty: line.qty,
        pieces: line.pieces,
        unitPrice: line.unitPrice,
        amount: line.amount,
        notes: line.notes ?? null,
      }, conn)
      await invRepo.incrementQuantity(line.productId, line.qty, conn)
    }
    await conn.commit()
    return getReturn(id)
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}
