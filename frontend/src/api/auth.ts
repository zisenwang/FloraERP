import client from "./client";

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: { id: number; username: string; name: string; role: string };
}

export const login = async (payload: LoginPayload): Promise<LoginResponse> => {
  const res = await client.post<{ data: LoginResponse }>(
    "/auth/login",
    payload,
  );
  return res.data.data;
};
