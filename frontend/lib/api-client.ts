// Server-side code (Server Actions, NextAuth) runs inside the container and must
// reach the api service by its Docker network name, not localhost. Browser code
// always uses NEXT_PUBLIC_API_URL since it runs outside the Docker network.
const API_URL =
  typeof window === "undefined"
    ? (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000")
    : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000");

export interface APIResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

class APIError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const body: APIResponse<T> = await res.json();

  if (!res.ok || !body.success) {
    throw new APIError(body.error ?? "Request failed", res.status);
  }

  return body.data as T;
}

export const apiClient = {
  register: (input: { email: string; name: string; password: string }) =>
    request<UserResponse>("/users/register", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  login: (input: { email: string; password: string }) =>
    request<TokenResponse>("/users/login", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  me: (accessToken: string) =>
    request<UserResponse>("/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
};

export { APIError };
