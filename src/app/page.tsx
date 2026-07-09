"use client";

import { FashionStore } from "@/components/FashionStore";
import { AssistantWidget } from "@/components/AssistantWidget";

export default function Home() {
  return (
    <main>
      <FashionStore />
      <AssistantWidget />
    </main>
  );
}
