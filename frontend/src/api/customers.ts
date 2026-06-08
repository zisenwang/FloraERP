import client from "./client";

export interface Customer {
  id: number;
  code: string;
  name: string;
  contact: string;
  phone: string;
  address: string;
  city: string;
  level: string;
  status: number;
  created_at: string;
}

export type CustomerPayload = Omit<Customer, "id" | "created_at">;

export const getCustomers = async (search?: string): Promise<Customer[]> => {
  const res = await client.get<{ data: Customer[] }>("/customers", {
    params: { search },
  });
  return res.data.data;
};

export const createCustomer = async (
  payload: CustomerPayload,
): Promise<Customer> => {
  const res = await client.post<{ data: Customer }>("/customers", payload);
  return res.data.data;
};

export const updateCustomer = async (
  id: number,
  payload: CustomerPayload,
): Promise<Customer> => {
  const res = await client.put<{ data: Customer }>(`/customers/${id}`, payload);
  return res.data.data;
};

export const deleteCustomer = async (id: number): Promise<void> => {
  await client.delete(`/customers/${id}`);
};
