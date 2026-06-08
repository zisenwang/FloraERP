export interface Supplier {
  id: number
  code: string
  name: string
  contact: string | null
  phone: string | null
  address: string | null
  city: string | null
  status: number
}

export interface CreateSupplierDto {
  code: string
  name: string
  contact?: string
  phone?: string
  address?: string
  city?: string
}

export interface UpdateSupplierDto extends Partial<CreateSupplierDto> {
  status?: number
}
