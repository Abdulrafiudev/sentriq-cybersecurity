"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAuthConfig, fetchCurrentUser, login, logout } from "@/services/authService";
import { readToken } from "@/services/apiClient";
import { queryKeys } from "./queryKeys";

export function useAuthConfig() {
  return useQuery({ queryKey: queryKeys.authConfig, queryFn: fetchAuthConfig, retry: false });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 5 * 60_000,
    // Without a token there is nothing to ask about.
    enabled: typeof window !== "undefined" && Boolean(readToken()),
  });
}

export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: login,
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.me, user);
      router.replace("/");
      router.refresh();
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return () => {
    logout();
    queryClient.clear();
    router.replace("/login");
  };
}
