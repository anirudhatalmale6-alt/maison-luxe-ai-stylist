"use client";

import { ReactNode } from "react";
import { StoreProvider } from "@/context/StoreContext";
import { AssistantProvider } from "@/context/AssistantContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <AssistantProvider>{children}</AssistantProvider>
    </StoreProvider>
  );
}
