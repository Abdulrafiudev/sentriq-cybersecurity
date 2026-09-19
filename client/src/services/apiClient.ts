import axios, { type AxiosError } from "axios";

/**
 * Shared axios instance. Every service imports this rather than calling axios
 * directly, so base URL, auth header and error shaping live in one place.
 */

export const TOKEN_COOKIE = "sentriq_token";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api",
  timeout: 60_000,
  headers: { "Content-Type": "application/json" },
});

export function readToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${TOKEN_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(TOKEN_COOKIE.length + 1)) : null;
}

/**
 * The token is stored in a readable cookie so Next middleware can gate routes
 * without a server session. That is a deliberate simplification for this scope
 * (PRD §13: keep auth simple) — a production build would use an HttpOnly cookie
 * set by the API and a server-side session check.
 */
export function writeToken(token: string, maxAgeSeconds = 12 * 60 * 60) {
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
}

export function clearToken() {
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

apiClient.interceptors.request.use((config) => {
  const token = readToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: unknown;
}

/** Turns any axios failure into a message worth showing an analyst. */
export function toApiError(error: unknown): ApiErrorShape {
  const axiosError = error as AxiosError<{ error?: ApiErrorShape }>;

  if (axiosError?.response?.data?.error) return axiosError.response.data.error;

  if (axiosError?.code === "ERR_NETWORK") {
    return {
      code: "network_error",
      message: "Cannot reach the Sentriq API. Check that the server is running on port 4000.",
    };
  }

  if (axiosError?.code === "ECONNABORTED") {
    return { code: "timeout", message: "The request timed out before the pipeline finished." };
  }

  return {
    code: "unknown",
    message: error instanceof Error ? error.message : "Something went wrong",
  };
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // A 401 means the session is gone; drop the stale cookie so the guard fires.
    if (error.response?.status === 401 && typeof document !== "undefined") clearToken();
    return Promise.reject(error);
  },
);
