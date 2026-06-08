export interface Customer {
  id: number
  code: string
  name: string
  contact: string | null
  phone: string | null
  city: string | null
  address: string | null
  level: string | null
  status: number
}

export interface CreateCustomerDto {
  code: string
  name: string
  contact?: string
  phone?: string
  city?: string
  address?: string
  level?: string
}

export interface UpdateCustomerDto extends Partial<CreateCustomerDto> {
  status?: number
}
