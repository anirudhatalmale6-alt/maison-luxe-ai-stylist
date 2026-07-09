import { NextRequest, NextResponse } from "next/server";
import { invokeBedrockAgent } from "@/lib/bedrock-client";
import { generateAssistantResponse } from "@/lib/openai-client";
import { searchCatalog } from "@/lib/rag-search";
import {
  orders,
  findProductById,
  getCustomerProfile,
} from "@/data/mock-database";
import {
  AssistantRequest,
  AssistantResponse,
  CartItem,
  LastViewedItem,
  Product,
  RagSearchResult,
  SessionState,
} from "@/types";
import { buildProductCards } from "./helpers";

const ESCALATION_KEYWORDS = [
  "speak to a human",
  "talk to a human",
  "talk to agent",
  "speak to agent",
  "connect me to",
  "connect me with",
  "human agent",
  "live agent",
  "real person",
  "this is unacceptable",
  "i'm furious",
  "i am furious",
  "i'm angry",
  "i am angry",
  "terrible service",
  "worst service",
  "manager",
  "supervisor",
  "complaint",
  "file a complaint",
];

let escalationCounter = 0;

function detectEscalation(message: string): boolean {
  const lower = message.toLowerCase();
  return ESCALATION_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function generateEscalationId(): string {
  escalationCounter++;
  return `esc_${Date.now()}_${escalationCounter}`;
}

function resolveItemName(itemId: string): string {
  return findProductById(itemId)?.name ?? itemId;
}

function formatStockStatus(result: RagSearchResult): string {
  const product = result.data as Product;
  return product.inStock && product.stockCount > 0
    ? `in stock (${product.stockCount})`
    : "out of stock";
}

function formatPrice(result: RagSearchResult): string {
  return `$${result.data.price.toFixed(2)}`;
}

function formatCatalogContext(results: RagSearchResult[]): string {
  if (results.length === 0) {
    return "No matching products found.";
  }

  return results
    .map((r) => {
      const product = r.data as Product;
      const base = `[${r.type.toUpperCase()}] ${r.name} — ${formatPrice(r)} — ${formatStockStatus(r)} — score: ${r.score.toFixed(3)}`;
      const attrs: string[] = [];
      if (product.material) attrs.push(product.material);
      if (product.colors?.length) attrs.push(`colours: ${product.colors.join(", ")}`);
      if (product.sizes?.length) attrs.push(`sizes: ${product.sizes.join(", ")}`);
      const attrLine = attrs.length ? `\n  ${attrs.join(" | ")}` : "";
      return `${base}\n  ${product.description}${attrLine}`;
    })
    .join("\n");
}

function buildLayer2Context(
  currentPath?: string,
  lastViewed?: LastViewedItem,
  cart?: CartItem[]
): string {
  const parts: string[] = [];

  if (currentPath && currentPath !== "/") {
    parts.push(`Current page: ${currentPath}`);
  }

  if (lastViewed) {
    parts.push(`Last viewed item: ${lastViewed.title} (ID: ${lastViewed.id})`);
  }

  if (cart && cart.length > 0) {
    const cartLines = cart
      .map((item) => `${item.title} x${item.quantity}`)
      .join(", ");
    parts.push(`Cart: ${cartLines}`);
  }

  return parts.length > 0 ? parts.join("\n") : "No active session context.";
}

function buildLayer3Context(customerId: string): string {
  const customerOrders = orders
    .filter((order) => order.customerId === customerId)
    .sort(
      (a, b) =>
        new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
    )
    .slice(0, 5);

  if (customerOrders.length === 0) {
    return "Buyer purchase history: none on file.";
  }

  const orderLines = customerOrders.map((order) => {
    const itemName = resolveItemName(order.itemId);
    return `- ${itemName} (${order.itemType}) on ${order.purchaseDate} — status: ${order.status}`;
  });

  return `Buyer purchase history (this customer's OWN past orders — use ONLY when the customer asks about their own account or personal recommendations; do NOT use for gift/recipient recommendations):\n${orderLines.join("\n")}`;
}

function buildCombinedContext(
  catalogContext: string,
  layer2Context: string,
  layer3Context: string | null
): string {
  const parts = [
    "=== CATALOG CONTEXT ===",
    catalogContext,
    "",
    "=== SESSION CONTEXT ===",
    layer2Context,
  ];

  if (layer3Context) {
    parts.push("", "=== PURCHASE HISTORY ===", layer3Context);
  }

  return parts.join("\n");
}

function buildSuggestions(
  message: string,
  results: RagSearchResult[]
): string[] {
  const lower = message.toLowerCase();
  const suggestions: string[] = [];

  if (results.length > 0) {
    suggestions.push(`Style a full look around the ${results[0].name}`);
    if (results.length > 1) {
      suggestions.push(`Compare the ${results[0].name} and ${results[1].name}`);
    }
  }

  if (lower.includes("wedding") || lower.includes("evening") || lower.includes("gala") || lower.includes("occasion")) {
    suggestions.push("What shoes and bag would complete this?");
  }

  if (lower.includes("gift")) {
    suggestions.push("Show me gift ideas under $500");
  }

  if (suggestions.length === 0) {
    suggestions.push("What are your standout pieces this season?");
  }

  return suggestions.slice(0, 3);
}

function buildCartSuggestions(
  cart: CartItem[],
  results: RagSearchResult[]
): CartItem[] {
  const cartIds = new Set(cart.map((item) => item.id));
  return results
    .filter((r) => !cartIds.has(r.id))
    .slice(0, 3)
    .map((r) => ({
      id: r.id,
      title: r.name,
      quantity: 1,
    }));
}

export async function POST(request: NextRequest) {
  try {
    const body: AssistantRequest = await request.json();
    const {
      message,
      sessionId: requestedSessionId,
      sessionState,
      cart,
      currentPath,
      lastViewed,
      voice,
      history,
    } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const customerId = request.headers.get("x-customer-id");
    const customerProfile = customerId
      ? getCustomerProfile(customerId)
      : undefined;

    // Resolve session fields from new body shape, falling back to legacy sessionState
    const resolvedCart: CartItem[] =
      cart ??
      (sessionState?.cart.map((title) => ({ id: title, title, quantity: 1 })) ||
        []);
    const resolvedCurrentPath = currentPath ?? sessionState?.currentPath;
    const resolvedLastViewed: LastViewedItem | undefined =
      lastViewed ??
      (sessionState?.lastViewed
        ? { id: sessionState.lastViewed, title: sessionState.lastViewed }
        : undefined);

    const sessionId =
      requestedSessionId ?? `session_${customerId || "anon"}_${Date.now()}`;

    // Layer 2: session context
    const layer2Context = buildLayer2Context(
      resolvedCurrentPath,
      resolvedLastViewed,
      resolvedCart
    );

    // Layer 3: purchase history
    const layer3Context = customerId ? buildLayer3Context(customerId) : null;

    // Layer 1: catalog RAG context
    const catalogResults = await searchCatalog(message);
    const catalogContext = formatCatalogContext(catalogResults);

    // Combine all grounded context
    const combinedContext = buildCombinedContext(
      catalogContext,
      layer2Context,
      layer3Context
    );

    const responseContext =
      combinedContext.length > 800
        ? `${combinedContext.slice(0, 797)}...`
        : combinedContext;

    if (detectEscalation(message)) {
      const escalationId = generateEscalationId();

      try {
        await fetch(`${request.nextUrl.origin}/api/webhook/escalation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agent_escalation: true,
            customer_name: customerProfile?.name || "Unknown Customer",
            customer_id: customerId || "unknown",
            transcript_history: [message],
            active_session: {
              cart: resolvedCart.map((item) => item.title),
              currentPath: resolvedCurrentPath ?? "/",
              lastViewed: resolvedLastViewed?.title ?? null,
            } as SessionState,
            escalation_id: escalationId,
            timestamp: Date.now(),
          }),
        });
      } catch {
        // Webhook failure is non-blocking
      }

      const response: AssistantResponse = {
        response:
          "I understand you'd like to speak with a live agent. I'm connecting you now. Please hold on while I transfer you to a human representative who can better assist you.",
        context: responseContext,
        suggestions: [],
        handoff: true,
        cartSuggestions: [],
        escalationId,
      };

      return NextResponse.json(response);
    }

    // LLM call: Bedrock default, OpenAI optional fallback
    let aiResponse: string;
    const useOpenAI =
      process.env.OPENAI_LLM_PROVIDER === "openai" && process.env.OPENAI_API_KEY;

    if (useOpenAI) {
      aiResponse = await generateAssistantResponse(message, combinedContext);
    } else {
      aiResponse = await invokeBedrockAgent(message, sessionId, combinedContext, history);
    }

    if (aiResponse === "__ESCALATE__") {
      const escalationId = generateEscalationId();

      try {
        await fetch(`${request.nextUrl.origin}/api/webhook/escalation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agent_escalation: true,
            customer_name: customerProfile?.name || "Unknown Customer",
            customer_id: customerId || "unknown",
            transcript_history: [message],
            active_session: {
              cart: resolvedCart.map((item) => item.title),
              currentPath: resolvedCurrentPath ?? "/",
              lastViewed: resolvedLastViewed?.title ?? null,
            } as SessionState,
            escalation_id: escalationId,
            timestamp: Date.now(),
          }),
        });
      } catch {
        // Webhook failure is non-blocking
      }

      return NextResponse.json({
        response:
          "I'm connecting you to a live agent now. They'll be able to help you with anything beyond what I can assist with. Please hold on.",
        context: responseContext,
        suggestions: [],
        handoff: true,
        cartSuggestions: [],
        escalationId,
      } satisfies AssistantResponse);
    }

    const suggestions = buildSuggestions(message, catalogResults);
    const cartSuggestions = buildCartSuggestions(resolvedCart, catalogResults);

    const products = buildProductCards(catalogResults, aiResponse);

    const response: AssistantResponse = {
      response: aiResponse,
      context: responseContext,
      suggestions,
      handoff: false,
      cartSuggestions,
      products,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Assistant API error:", error);
    return NextResponse.json(
      {
        response:
          "I apologize, but I'm experiencing a temporary issue. Please try again in a moment, or type 'connect me to a human agent' if you need immediate assistance.",
        context: "",
        suggestions: [],
        handoff: false,
        cartSuggestions: [],
      } satisfies AssistantResponse,
      { status: 200 }
    );
  }
}
