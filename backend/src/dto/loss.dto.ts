export interface LossRecord {
  id: number
  productId: number
  productCode: string
  productName: string
  spec: string | null
  grade: string | null
  unit: string
  qty: number
  reason: string | null
  operator: string | null
  date: string
  notes: string | null
}

export interface CreateLossDto {
  productId: number
  qty: number
  reason?: string
  date: string
  notes?: string
}
