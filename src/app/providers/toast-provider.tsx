"use client";

import { Toaster } from "@/src/shared/ui/kit/sonner";

export function ToastProvider() {
  return <Toaster position="top-right" richColors closeButton />;
}
