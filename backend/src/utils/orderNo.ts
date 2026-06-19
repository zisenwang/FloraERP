// Order number generators
// Format: {prefix}{YYYY}{M}G{DD}_D{id}
// e.g. X20265G20_D701 (sales), C20265G20_D44 (purchase)

export function genSalesNo(id: number, date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = String(date.getDate()).padStart(2, '0')
  return `X${y}${m}G${d}_D${id}`
}

export function genPurchaseNo(id: number, date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = String(date.getDate()).padStart(2, '0')
  return `C${y}${m}G${d}_D${id}`
}

export function genPurchaseReturnNo(id: number, date: Date = new Date()): string {
  // Format: CR{year}{month}G{DD}_D{id}  e.g. CR20266G19_D5
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = String(date.getDate()).padStart(2, '0')
  return `CR${y}${m}G${d}_D${id}`
}

export function genSalesReturnNo(id: number, date: Date = new Date()): string {
  // Format: XR{year}{month}G{DD}_D{id}
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = String(date.getDate()).padStart(2, '0')
  return `XR${y}${m}G${d}_D${id}`
}
