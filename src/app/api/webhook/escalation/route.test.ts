import { test, describe, afterEach } from "node:test";
import assert from "node:assert";
import { SessionState } from "@/types";
import {
  forwardEscalationToWebhook,
  isValidEscalationWebhookUrl,
  validateEscalationPayload,
} from "./helpers";

describe("isValidEscalationWebhookUrl", () => {
  test("accepts http:// URLs", () => {
    assert.strictEqual(
      isValidEscalationWebhookUrl("http://example.com"),
      true
    );
  });

  test("accepts https:// URLs", () => {
    assert.strictEqual(
      isValidEscalationWebhookUrl("https://example.com/webhook"),
      true
    );
  });

  test("rejects missing or empty values", () => {
    assert.strictEqual(isValidEscalationWebhookUrl(undefined), false);
    assert.strictEqual(isValidEscalationWebhookUrl(""), false);
    assert.strictEqual(isValidEscalationWebhookUrl("   "), false);
  });

  test("rejects non-http(s) protocols and malformed strings", () => {
    assert.strictEqual(isValidEscalationWebhookUrl("ftp://example.com"), false);
    assert.strictEqual(isValidEscalationWebhookUrl("example.com"), false);
    assert.strictEqual(isValidEscalationWebhookUrl("mailto:a@b.com"), false);
  });
});

describe("validateEscalationPayload", () => {
  const activeSession: SessionState = {
    cart: ["Unlimited Plan"],
    currentPath: "/plans",
    lastViewed: "plan_1",
  };

  const validPayload = {
    agent_escalation: true,
    customer_name: "Alice",
    customer_id: "cust_123",
    transcript_history: ["hello"],
    active_session: activeSession,
    escalation_id: "esc_1",
    timestamp: Date.now(),
  };

  test("accepts a complete, valid payload", () => {
    assert.strictEqual(validateEscalationPayload(validPayload), true);
  });

  test("rejects payload when agent_escalation is not true", () => {
    assert.strictEqual(
      validateEscalationPayload({ ...validPayload, agent_escalation: false }),
      false
    );
    assert.strictEqual(
      validateEscalationPayload({ ...validPayload, agent_escalation: "true" }),
      false
    );
  });

  test("rejects payload with missing required fields", () => {
    assert.strictEqual(
      validateEscalationPayload({ ...validPayload, customer_id: undefined }),
      false
    );
    assert.strictEqual(
      validateEscalationPayload({
        ...validPayload,
        transcript_history: undefined,
      }),
      false
    );
    assert.strictEqual(
      validateEscalationPayload({ ...validPayload, escalation_id: undefined }),
      false
    );
    assert.strictEqual(
      validateEscalationPayload({ ...validPayload, timestamp: undefined }),
      false
    );
  });

  test("rejects payload with wrong field types", () => {
    assert.strictEqual(
      validateEscalationPayload({ ...validPayload, customer_id: 123 }),
      false
    );
    assert.strictEqual(
      validateEscalationPayload({ ...validPayload, transcript_history: "hi" }),
      false
    );
    assert.strictEqual(
      validateEscalationPayload({ ...validPayload, escalation_id: 1 }),
      false
    );
    assert.strictEqual(
      validateEscalationPayload({ ...validPayload, timestamp: "now" }),
      false
    );
  });

  test("rejects payload with invalid active_session", () => {
    assert.strictEqual(
      validateEscalationPayload({
        ...validPayload,
        active_session: { invalid: true },
      }),
      false
    );
    assert.strictEqual(
      validateEscalationPayload({ ...validPayload, active_session: null }),
      false
    );
  });
});

describe("forwardEscalationToWebhook", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const payload = {
    agent_escalation: true as const,
    customer_name: "Alice",
    customer_id: "cust_123",
    transcript_history: ["hello"],
    active_session: {
      cart: ["Unlimited Plan"],
      currentPath: "/plans",
      lastViewed: "plan_1" as string | null,
    },
    escalation_id: "esc_1",
    timestamp: 1,
  };

  test("posts JSON payload to the provided URL", async () => {
    let captured: {
      url: string;
      init: RequestInit | undefined;
      body: unknown;
    } | null = null;

    globalThis.fetch = async (url, init) => {
      captured = {
        url: String(url),
        init,
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      };
      return { ok: true, status: 200 } as Response;
    };

    await assert.doesNotReject(async () => {
      await forwardEscalationToWebhook("https://hooks.example.com/escalate", payload);
    });

    if (captured === null) {
      throw new Error("Expected fetch to be called");
    }
    const capture = captured;
    assert.strictEqual(capture.url, "https://hooks.example.com/escalate");
    assert.strictEqual(capture.init?.method, "POST");
    const headers = capture.init?.headers as Record<string, string>;
    assert.strictEqual(headers["Content-Type"], "application/json");
    assert.deepStrictEqual(capture.body, payload);
  });

  test("does not throw when external webhook returns non-OK response", async () => {
    globalThis.fetch = async () => {
      return { ok: false, status: 500, text: async () => "server error" } as Response;
    };

    await assert.doesNotReject(async () => {
      await forwardEscalationToWebhook("https://hooks.example.com/escalate", payload);
    });
  });

  test("does not throw when external webhook request fails", async () => {
    globalThis.fetch = async () => {
      throw new Error("network failure");
    };

    await assert.doesNotReject(async () => {
      await forwardEscalationToWebhook("https://hooks.example.com/escalate", payload);
    });
  });
});
