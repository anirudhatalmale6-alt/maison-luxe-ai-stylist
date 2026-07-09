import { EscalationPayload, SessionState } from "@/types";

export function isValidEscalationWebhookUrl(
  url: string | undefined
): url is string {
  return (
    typeof url === "string" &&
    url.trim().length > 0 &&
    /^https?:\/\//i.test(url)
  );
}

function isSessionState(value: unknown): value is SessionState {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const s = value as Record<string, unknown>;
  return (
    Array.isArray(s.cart) &&
    typeof s.currentPath === "string" &&
    (s.lastViewed === null || typeof s.lastViewed === "string")
  );
}

export function validateEscalationPayload(
  payload: unknown
): payload is EscalationPayload {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }
  const p = payload as Record<string, unknown>;

  if (p.agent_escalation !== true) {
    return false;
  }
  if (typeof p.customer_id !== "string") {
    return false;
  }
  if (!Array.isArray(p.transcript_history)) {
    return false;
  }
  if (typeof p.escalation_id !== "string") {
    return false;
  }
  if (typeof p.timestamp !== "number") {
    return false;
  }
  if (typeof p.customer_name !== "string") {
    return false;
  }
  if (!isSessionState(p.active_session)) {
    return false;
  }

  return true;
}

export async function forwardEscalationToWebhook(
  url: string,
  payload: EscalationPayload
): Promise<void> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error(
        `External escalation webhook returned ${response.status}: ${text}`
      );
    }
  } catch (error) {
    console.error("External escalation webhook request failed:", error);
  }
}
