import client from './client'

export interface Product {
  id: number
  code: string
  supplier_id: number
  supplier_name: string
  name: string
  category: string
  unit: string
  price: number
  stock: number
  status: number
}

export type ProductPayload = Omit<Product, 'id' | 'supplier_name' | 'stock'>

export const getProducts = async (params?: { supplier_id?: number; search?: string }): Promise<Product[]> => {
  const res = await client.get<{ data: Product[] }>('/products', { params })
  return res.data.data
}

export const createProduct = async (payload: ProductPayload): Promise<Product> => {
  const res = await client.post<{ data: Product }>('/products', payload)
  return res.data.data
}

export const updateProduct = async (id: number, payload: ProductPayload): Promise<Product> => {
  const res = await client.put<{ data: Product }>(`/products/${id}`, payload)
  return res.data.data
}

export const deleteProduct = async (id: number): Promise<void> => {
  await client.delete(`/products/${id}`)
}
