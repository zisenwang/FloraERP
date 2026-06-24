import * as XLSX from 'xlsx'
import type { ReportOrderRow, InventoryReportItem } from '@/api/reports'

function autoWidth(ws: XLSX.WorkSheet) {
  const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 })
  const colWidths: number[] = []
  data.forEach(row => {
    row.forEach((cell, ci) => {
      const len = String(cell ?? '').length * 1.5 + 2
      if (!colWidths[ci] || colWidths[ci] < len) colWidths[ci] = len
    })
  })
  ws['!cols'] = colWidths.map(w => ({ wch: Math.min(w, 40) }))
}

/**
 * Sales export — customer-facing: no cost price, no profit, no original amount,
 * supplier shown as code only.
 * @param label  Optional entity name for per-row exports (e.g. customer name)
 */
export function exportSalesExcel(
  rows: ReportOrderRow[],
  startDate: string,
  endDate: string,
  label?: string,
) {
  const sheetData: Record<string, string | number>[] = rows.map(r => ({
    '日期': r.orderDate,
    '单号': r.orderNo,
    '客户': r.customerName ?? '',
    '货品编码': r.productCode ?? '',
    '货品名称': r.productName ?? '',
    '供应商': r.supplierCode ?? '',   // code only, no name
    '数量': r.qty,
    '单价': r.unitPrice,
    '金额': r.finalAmount,
    '件数': r.pieces || 0,
    '备注': r.notes ?? '',
  }))

  const totalQty    = rows.reduce((s, r) => s + r.qty, 0)
  const totalPieces = rows.reduce((s, r) => s + (r.pieces || 0), 0)
  const totalAmount = rows.reduce((s, r) => s + r.finalAmount, 0)
  sheetData.push({
    '日期': '',
    '单号': '',
    '客户': '',
    '货品编码': '',
    '货品名称': '合计',
    '供应商': '',
    '数量': totalQty,
    '单价': '',
    '金额': totalAmount,
    '件数': totalPieces,
    '备注': '',
  })

  const ws = XLSX.utils.json_to_sheet(sheetData)
  autoWidth(ws)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '销售明细')
  const name = label ? `销售报表_${label}_${startDate}_${endDate}` : `销售报表_${startDate}_${endDate}`
  XLSX.writeFile(wb, `${name}.xlsx`)
}

/**
 * Purchase export — internal use: full supplier name, all amounts.
 * @param label  Optional entity name for per-row exports
 */
export function exportPurchaseExcel(
  rows: ReportOrderRow[],
  startDate: string,
  endDate: string,
  label?: string,
) {
  const sheetData: Record<string, string | number>[] = rows.map(r => ({
    '日期': r.orderDate,
    '单号': r.orderNo,
    '供应商': r.supplierName ?? '',
    '货品编码': r.productCode ?? '',
    '货品名称': r.productName ?? '',
    '数量': r.qty,
    '单价': r.unitPrice,
    '原价金额': r.amount,
    '折扣(%)': r.discount,
    '折后金额': r.finalAmount,
    '件数': r.pieces || 0,
  }))

  const totalQty    = rows.reduce((s, r) => s + r.qty, 0)
  const totalPieces = rows.reduce((s, r) => s + (r.pieces || 0), 0)
  const totalAmount = rows.reduce((s, r) => s + r.finalAmount, 0)
  sheetData.push({
    '日期': '', '单号': '', '供应商': '', '货品编码': '',
    '货品名称': '合计',
    '数量': totalQty,
    '单价': '', '原价金额': '', '折扣(%)': '',
    '折后金额': totalAmount,
    '件数': totalPieces,
  })

  const ws = XLSX.utils.json_to_sheet(sheetData)
  autoWidth(ws)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '进货明细')
  const name = label ? `采购报表_${label}_${startDate}_${endDate}` : `采购报表_${startDate}_${endDate}`
  XLSX.writeFile(wb, `${name}.xlsx`)
}

export function exportInventoryExcel(rows: InventoryReportItem[]) {
  const getPieces = (r: InventoryReportItem) =>
    r.unitsPerPiece ? Math.ceil(r.stock / r.unitsPerPiece) : 0

  const sheetData: Record<string, string | number>[] = rows.map(r => ({
    '编码': r.productCode,
    '货品名称': r.productName,
    '供应商': r.supplierName,
    '分类': r.category ?? '',
    '单位': r.unit,
    '当前库存': r.stock,
    '件数': r.unitsPerPiece ? getPieces(r) : '',
    '成本价': r.costPrice != null ? r.costPrice : '',
    '售价': r.price != null ? r.price : '',
  }))

  const totalQty    = rows.reduce((s, r) => s + r.stock, 0)
  const totalPieces = rows.reduce((s, r) => s + getPieces(r), 0)
  sheetData.push({
    '编码': '', '货品名称': '合计', '供应商': '', '分类': '', '单位': '',
    '当前库存': totalQty,
    '件数': totalPieces,
    '成本价': '',
    '售价': '',
  })

  const ws = XLSX.utils.json_to_sheet(sheetData)
  autoWidth(ws)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '库存报表')
  XLSX.writeFile(wb, `库存报表_${new Date().toISOString().slice(0, 10)}.xlsx`)
}
