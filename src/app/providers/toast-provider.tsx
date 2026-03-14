"use client";

import { Toaster } from "react-hot-toast";

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: "#1B211E",
          color: "#FFFFFF",
          borderRadius: "8px",
          fontSize: "14px",
        },
        success: {
          iconTheme: { primary: "#00CD72", secondary: "#FFFFFF" },
        },
        error: {
          iconTheme: { primary: "#F04452", secondary: "#FFFFFF" },
        },
      }}
    />
  );
}
