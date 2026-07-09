"use client";

import { useAssistant } from "@/context/AssistantContext";

export function HandoffBanner() {
  const { isHandoffActive } = useAssistant();

  if (!isHandoffActive) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 animate-slide-up">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
          </span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-800">
            Escalating to Live Agent...
          </p>
          <p className="text-xs text-amber-600">
            A human representative will be with you shortly.
          </p>
        </div>
      </div>
    </div>
  );
}
