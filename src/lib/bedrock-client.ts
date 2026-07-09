import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseStreamCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { searchCatalog, searchCatalogWithDetails } from "./rag-search";

const AWS_CONFIGURED = !!(
  process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
);

const MODEL_ID =
  process.env.BEDROCK_MODEL_ID || "amazon.nova-micro-v1:0";

let runtimeClient: BedrockRuntimeClient | null = null;

function getClient(): BedrockRuntimeClient {
  if (!runtimeClient) {
    runtimeClient = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: AWS_CONFIGURED
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
          }
        : undefined,
    });
  }
  return runtimeClient;
}

// System prompt: behavior rules ONLY — no hardcoded catalog
const SYSTEM_PROMPT = `You are the personal shopping stylist for "MAISON LUXE", a high-end designer fashion house. You help clients discover ready-to-wear, outerwear, shoes, handbags, and accessories, and you offer styling advice.

RULES:
- Be warm, polished and concise — the tone of a knowledgeable luxury personal shopper. Keep responses under 200 words unless styling a full look.
- ONLY use the product data provided in the RETRIEVED PRODUCTS section of the user message. Do NOT invent products, prices, materials, or availability.
- If no relevant products are retrieved, say you don't have a match right now and ask a clarifying question (occasion, size, colour, budget, or style).
- Style complete looks: when a client asks about a dress or piece, suggest how to complete the outfit (shoes, bag, outerwear, jewellery) using only retrieved products.
- Offer guidance on occasion (work, evening, wedding, weekend), fabric/material, fit, and sizing when helpful.
- If a client mentions a budget, recommend pieces within it and note the best value.
- When comparing pieces, contrast material, silhouette/fit, colour and price, and highlight your recommendation.
- If the user asks to speak to a human or a stylist/advisor by phone, respond with exactly: __ESCALATE__
- Use the client's name if it is provided in context.
- PURCHASE HISTORY, if provided, is the client's own order history. Mention it ONLY when the user asks about their own account or personal recommendations. NEVER assume, invent, or bring up past purchases when the client is shopping for a gift or for someone else.
- If purchase history is empty, missing, or says "none on file", NEVER state or imply the client has bought anything before. Do not say "Considering your recent purchases", "Since you bought...", or anything similar.
- If you do not have enough information, ask a clarifying question instead of guessing.`;

// Build RAG context: search catalog for relevant products per query
async function buildRagContext(userMessage: string): Promise<string> {
  const results = await searchCatalog(userMessage);
  if (results.length === 0) return "";

  const productsText = results
    .map((r) => {
      const a = r.data as any;
      const attrs: string[] = [];
      if (a.designer) attrs.push(a.designer);
      if (a.material) attrs.push(a.material);
      if (a.colors?.length > 0) attrs.push(`colours: ${a.colors.join(", ")}`);
      if (a.sizes?.length > 0) attrs.push(`sizes: ${a.sizes.join(", ")}`);
      const attrText = attrs.length > 0 ? ` (${attrs.join("; ")})` : "";
      return `[${r.type.toUpperCase()}] ${a.name} — $${a.price}${attrText}: ${a.description}`;
    })
    .join("\n");

  return `[RETRIEVED PRODUCTS — use only these for recommendations]\n${productsText}`;
}

export async function invokeBedrockAgent(
  prompt: string,
  sessionId: string,
  context: string,
  history?: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  if (!AWS_CONFIGURED) {
    return localFallbackEngine(prompt, context);
  }

  try {
    const client = getClient();

    // Always run RAG — search catalog for relevant products per query
    const ragContext = await buildRagContext(prompt);

    // Compose user message with context injected
    const userMessageParts: string[] = [];
    if (ragContext) userMessageParts.push(ragContext);
    if (context) userMessageParts.push(context);
    userMessageParts.push(`User: ${prompt}`);

    // Build conversation: prior turns (history) + current message
    const messages: { role: "user" | "assistant"; content: { text: string }[] }[] = [];
    if (history && history.length > 0) {
      for (const turn of history.slice(-6)) {
        const isUser = turn.role === "user";
        const priorContext = isUser ? "" : "";
        messages.push({
          role: isUser ? "user" : "assistant",
          content: [{ text: `${isUser ? "User" : "Assistant"}: ${turn.content}` }],
        });
      }
    }
    messages.push({
      role: "user",
      content: [{ text: userMessageParts.join("\n\n") }],
    });

    const command = new ConverseCommand({
      modelId: MODEL_ID,
      system: [{ text: SYSTEM_PROMPT }],
      messages,
      inferenceConfig: {
        maxTokens: 1024,
        temperature: 0.7,
        topP: 0.9,
      },
    });

    const response = await client.send(command);

    const output = response.output;
    if (output?.message?.content && output.message.content.length > 0) {
      const textContent = output.message.content.find((c) => c.text);
      if (textContent?.text) {
        return textContent.text;
      }
    }

    return localFallbackEngine(prompt, context);
  } catch (error) {
    console.error("Bedrock Converse error:", (error as Error).message);
    return localFallbackEngine(prompt, context);
  }
}

export async function invokeBedrockStream(
  prompt: string,
  sessionId: string,
  context: string,
  history?: { role: "user" | "assistant"; content: string }[]
): Promise<ReadableStream<string>> {
  if (!AWS_CONFIGURED) {
    const fallbackResponse = localFallbackEngine(prompt, context);
    return new ReadableStream({
      start(controller) {
        controller.enqueue(fallbackResponse);
        controller.close();
      },
    });
  }

  const client = getClient();
  const ragContext = await buildRagContext(prompt);

  const userMessageParts: string[] = [];
  if (ragContext) userMessageParts.push(ragContext);
  if (context) userMessageParts.push(context);
  userMessageParts.push(`User: ${prompt}`);

  const messages = [
    {
      role: "user" as const,
      content: [{ text: userMessageParts.join("\n\n") }],
    },
  ];

  const command = new ConverseStreamCommand({
    modelId: MODEL_ID,
    system: [{ text: SYSTEM_PROMPT }],
    messages,
    inferenceConfig: {
      maxTokens: 1024,
      temperature: 0.7,
      topP: 0.9,
    },
  });

  const response = await client.send(command);

  return new ReadableStream({
    async start(controller) {
      try {
        if (response.stream) {
          for await (const event of response.stream) {
            if (event.contentBlockDelta?.delta?.text) {
              controller.enqueue(event.contentBlockDelta.delta.text);
            }
          }
        }
        controller.close();
      } catch (error) {
        console.error("Stream error:", error);
        controller.error(error);
      }
    },
  });
}

function localFallbackEngine(prompt: string, context: string): string {
  const lower = prompt.toLowerCase();
  const ragResults = searchCatalogWithDetails(lower, 5);

  if (ragResults.length > 0) {
    const response = ragResults
      .map((r) => {
        const a = r.data as any;
        const bits: string[] = [];
        if (a.material) bits.push(a.material);
        if (a.colors?.length > 0) bits.push(a.colors.join(", "));
        const detail = bits.length > 0 ? ` — ${bits.join(", ")}` : "";
        return `**${a.name}** — $${a.price}${detail}: ${a.description}`;
      })
      .join("\n");

    return response + "\n\nWould you like me to style a full look around any of these?";
  }

  if (
    lower.includes("human") ||
    lower.includes("stylist") ||
    lower.includes("advisor") ||
    lower.includes("manager") ||
    lower.includes("representative")
  ) {
    return "__ESCALATE__";
  }

  if (
    lower.includes("hello") ||
    lower.includes("hi") ||
    lower.includes("hey") ||
    lower.includes("help")
  ) {
    return `Welcome to MAISON LUXE. I'm your personal stylist and I can help you with:\n\n• Finding the perfect piece for an occasion\n• Styling a complete look — dress, shoes, bag and jewellery\n• Guidance on fit, fabric and sizing\n• Outerwear, tailoring and everyday essentials\n\nWhat are you dressing for today?`;
  }

  return `I'd love to help you find something special. Could you tell me a little more — the occasion, a colour or style you love, or a budget in mind?`;
}
