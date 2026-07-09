import { NextRequest, NextResponse } from "next/server";
import { EscalationPayload } from "@/types";
import {
  forwardEscalationToWebhook,
  isValidEscalationWebhookUrl,
  validateEscalationPayload,
} from "./helpers";

declare global {
  var __escalationQueue: EscalationPayload[] | undefined;
}

if (!global.__escalationQueue) {
  global.__escalationQueue = [];
}

const escalationQueue = global.__escalationQueue;

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!validateEscalationPayload(payload)) {
    return NextResponse.json(
      { ok: false, error: "Invalid escalation payload" },
      { status: 400 }
    );
  }

  escalationQueue.push(payload);

  const externalWebhookUrl = process.env.ESCALATION_WEBHOOK_URL;
  if (isValidEscalationWebhookUrl(externalWebhookUrl)) {
    await forwardEscalationToWebhook(externalWebhookUrl, payload);
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ escalations: escalationQueue });
}
