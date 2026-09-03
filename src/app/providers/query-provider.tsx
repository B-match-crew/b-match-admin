"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { ActionFailure } from "@/src/shared/lib/unwrap";
import { isTerminalAuthCode } from "@/src/shared/lib/auth-error";

function retryUnlessTerminal(failureCount: number, error: unknown) {
  if (error instanceof ActionFailure && isTerminalAuthCode(error.code)) return false;
  return failureCount < 1;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            refetchOnWindowFocus: false,
            // 세션이 끊긴 화면은 조회가 6~8개씩 걸려 있어, 각각 한 번씩만 더
            // 재시도해도 실패 요청이 두 배가 된다. 결과가 바뀌지 않는 실패는
            // 곧바로 포기한다.
            retry: retryUnlessTerminal,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
