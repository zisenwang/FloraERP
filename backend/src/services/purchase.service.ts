import pool from '@/db/pool'
import * as purchaseRepo from '@/repositories/purchase.repo'
import * as invRepo from '@/repositories/inventory.repo'
import * as productRepo from '@/repositories/product.repo'
import { genPurchaseNo } from '@/utils/orderNo'
import { AppError } from '@/services/supplier.service'
import type {
  PurchaseOrder,
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
} from '@/dto/purchase.dto'

function computeLineTotals(items: CreatePurchaseOrderDto['items'], orderDiscount: number) {
  let totalQty = 0,
    totalAmount = 0
  const lines = items.map((item) => {
    const discount = item.discount ?? 100
    const amount = +(item.qty * item.unitPrice).toFixed(2)
    const finalAmount = +((amount * discount) / 100).toFixed(2)
    totalQty += item.qty
    totalAmount += finalAmount
    return { ...item, discount, amount, finalAmount }
  })
  totalAmount = +totalAmount.toFixed(2)
  const finalAmount = +((totalAmount * orderDiscount) / 100).toFixed(2)
  return { lines, totalQty, totalAmount, finalAmount }
}

export async function listOrders(
  filters: Parameters<typeof purchaseRepo.findAll>[0],
): Promise<PurchaseOrder[]> {
  return purchaseRepo.findAll(filters)
}

export async function getOrder(id: number): Promise<PurchaseOrder> {
  const order = await purchaseRepo.findById(id)
  if (!order) throw new AppError(404, '采购订单不存在')
  return order
}

export async function createOrder(
  dto: CreatePurchaseOrderDto,
  operator: string | null,
): Promise<PurchaseOrder> {
  const orderDiscount = dto.discount ?? 100
  const { lines, totalQty, totalAmount, finalAmount } = computeLineTotals(dto.items, orderDiscount)

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const orderId = await purchaseRepo.insertOrder(
      {
        supplierId: dto.supplierId,
        date: dto.orderDate,
        totalQty,
        totalAmount,
        discount: orderDiscount,
        finalAmount,
        operator,
        notes: dto.notes ?? null,
      },
      conn,
    )
    await purchaseRepo.setOrderNo(orderId, genPurchaseNo(orderId, new Date(dto.orderDate)), conn)

    for (const line of lines) {
      await purchaseRepo.insertItem(
        orderId,
        {
          productId: line.productId,
          qty: line.qty,
          unitPrice: line.unitPrice,
          amount: line.amount,
          discount: line.discount,
          finalAmount: line.finalAmount,
          notes: line.notes ?? null,
        },
        conn,
      )
      await productRepo.updateCostPrice(line.productId, line.unitPrice, conn)

      const qtyBefore = await invRepo.getQuantity(line.productId, conn)
      await invRepo.incrementQuantity(line.productId, line.qty, conn)
      await invRepo.logAdjustment(
        {
          productId: line.productId,
          type: 'in',
          qtyBefore,
          qtyChange: line.qty,
          qtyAfter: qtyBefore + line.qty,
          refType: 'purchase',
          refId: orderId,
          operator: operator ?? undefined,
        },
        conn,
      )
    }

    await conn.commit()
    return getOrder(orderId)
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}

export async function deleteOrder(id: number): Promise<void> {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const order = await purchaseRepo.findById(id)
    if (!order) throw new AppError(404, '采购订单不存在')
    const oldItems = await purchaseRepo.deleteItems(id, conn)
    for (const old of oldItems) {
      await invRepo.incrementQuantity(old.productId, -old.qty, conn)
    }
    await conn.query('DELETE FROM purchase_orders WHERE id = ?', [id])
    await conn.commit()
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}

export async function updateOrder(id: number, dto: UpdatePurchaseOrderDto): Promise<PurchaseOrder> {
  const orderDiscount = dto.discount ?? 100
  const { lines, totalQty, totalAmount, finalAmount } = computeLineTotals(dto.items, orderDiscount)

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const oldItems = await purchaseRepo.deleteItems(id, conn)
    for (const old of oldItems) {
      await invRepo.incrementQuantity(old.productId, -old.qty, conn)
    }

    await purchaseRepo.updateOrderTotals(
      id,
      {
        supplierId: dto.supplierId,
        date: dto.orderDate,
        totalQty,
        totalAmount,
        discount: orderDiscount,
        finalAmount,
        notes: dto.notes ?? null,
      },
      conn,
    )

    for (const line of lines) {
      await purchaseRepo.insertItem(
        id,
        {
          productId: line.productId,
          qty: line.qty,
          unitPrice: line.unitPrice,
          amount: line.amount,
          discount: line.discount,
          finalAmount: line.finalAmount,
          notes: line.notes ?? null,
        },
        conn,
      )
      await productRepo.updateCostPrice(line.productId, line.unitPrice, conn)
      await invRepo.incrementQuantity(line.productId, line.qty, conn)
    }

    await conn.commit()
    return getOrder(id)
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}
