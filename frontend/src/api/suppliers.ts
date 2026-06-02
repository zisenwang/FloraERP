import client from './client'

export interface Supplier {
  id: number
  code: string
  name: string
  contact: string
  phone: string
  address: string
  status: number
  created_at: string
}

export type SupplierPayload = Omit<Supplier, 'id' | 'created_at'>

export const getSuppliers = async (search?: string): Promise<Supplier[]> => {
  const res = await client.get<{ data: Supplier[] }>('/suppliers', { params: { search } })
  return res.data.data
}

export const createSupplier = async (payload: SupplierPayload): Promise<Supplier> => {
  const res = await client.post<{ data: Supplier }>('/suppliers', payload)
  return res.data.data
}

export const updateSupplier = async (id: number, payload: SupplierPayload): Promise<Supplier> => {
  const res = await client.put<{ data: Supplier }>(`/suppliers/${id}`, payload)
  return res.data.data
}

export const deleteSupplier = async (id: number): Promise<void> => {
  await client.delete(`/suppliers/${id}`)
}
