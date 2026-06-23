import pool from '@/db/pool'
import * as repo from '@/repositories/purchase-return.repo'
import * as invRepo from '@/repositories/inventory.repo'
import { genPurchaseReturnNo } from '@/utils/orderNo'
import { AppError } from '@/services/supplier.service'
import type { PurchaseReturn, CreatePurchaseReturnDto, UpdatePurchaseReturnDto } from '@/dto/purchase-return.dto'

function computeTotals(items: CreatePurchaseReturnDto['items']) {
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

export async function listReturns(filters: Parameters<typeof repo.findAll>[0]): Promise<PurchaseReturn[]> {
  return repo.findAll(filters)
}

export async function getReturn(id: number): Promise<PurchaseReturn> {
  const ret = await repo.findById(id)
  if (!ret) throw new AppError(404, '采购退货单不存在')
  return ret
}

export async function createReturn(dto: CreatePurchaseReturnDto, operator: string | null): Promise<PurchaseReturn> {
  const { lines, totalQty, totalPieces, totalAmount } = computeTotals(dto.items)
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const returnId = await repo.insertReturn({
      supplierId: dto.supplierId,
      originalOrderId: dto.originalOrderId ?? null,
      date: dto.returnDate,
      totalQty,
      totalPieces,
      totalAmount,
      operator,
      notes: dto.notes ?? null,
    }, conn)
    const seq = await repo.countByDate(dto.returnDate, returnId, conn)
    await repo.setReturnNo(returnId, genPurchaseReturnNo(seq, new Date(dto.returnDate)), conn)
    for (const line of lines) {
      await repo.insertItem(returnId, {
        productId: line.productId,
        qty: line.qty,
        pieces: line.pieces,
        unitPrice: line.unitPrice,
        amount: line.amount,
        notes: line.notes ?? null,
      }, conn)
      // Purchase return: goods go back to supplier → decrease inventory
      const qtyBefore = await invRepo.getQuantity(line.productId, conn)
      await invRepo.incrementQuantity(line.productId, -line.qty, conn)
      await invRepo.logAdjustment({
        productId: line.productId,
        type: 'out',
        qtyBefore,
        qtyChange: -line.qty,
        qtyAfter: qtyBefore - line.qty,
        refType: 'purchase_return',
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
    if (!ret) throw new AppError(404, '采购退货单不存在')
    const oldItems = await repo.deleteItems(id, conn)
    // Reverse the return: add inventory back
    for (const old of oldItems) {
      await invRepo.incrementQuantity(old.productId, old.qty, conn)
    }
    await conn.query('DELETE FROM purchase_returns WHERE id = ?', [id])
    await conn.commit()
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}

export async function updateReturn(id: number, dto: UpdatePurchaseReturnDto): Promise<PurchaseReturn> {
  const { lines, totalQty, totalPieces, totalAmount } = computeTotals(dto.items)
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const oldItems = await repo.deleteItems(id, conn)
    // Reverse old return's inventory effect
    for (const old of oldItems) {
      await invRepo.incrementQuantity(old.productId, old.qty, conn)
    }
    await repo.updateReturnTotals(id, {
      supplierId: dto.supplierId,
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
      await invRepo.incrementQuantity(line.productId, -line.qty, conn)
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
