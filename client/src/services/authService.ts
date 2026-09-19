import { apiClient, clearToken, writeToken } from "./apiClient";
import type { AuthUser } from "@/types/incident";

export interface AuthConfig {
  authEnabled: boolean;
  demoEmail: string | null;
  demoPassword: string | null;
}

export async function fetchAuthConfig(): Promise<AuthConfig> {
  const { data } = await apiClient.get<{ data: AuthConfig }>("/auth/config");
  return data.data;
}

export async function login(credentials: {
  email: string;
  password: string;
}): Promise<AuthUser> {
  const { data } = await apiClient.post<{ data: { token: string; user: AuthUser } }>(
    "/auth/login",
    credentials,
  );
  writeToken(data.data.token);
  return data.data.user;
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const { data } = await apiClient.get<{ data: AuthUser }>("/auth/me");
  return data.data;
}

export function logout() {
  clearToken();
}
