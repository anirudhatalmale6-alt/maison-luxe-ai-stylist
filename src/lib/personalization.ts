import { SessionState, CustomerProfile } from "@/types";
import { searchCatalog } from "./rag-search";
import { getOrdersByCustomer, findProductById } from "@/data/mock-database";

export async function buildPersonalizationContext(
  userMessage: string,
  sessionState: SessionState,
  customerProfile?: CustomerProfile
): Promise<string> {
  const parts: string[] = [];

  // Layer 1: Catalog RAG
  const ragResults = await searchCatalog(userMessage);
  if (ragResults.length > 0) {
    const ragSummary = ragResults
      .map((r) => {
        const p = r.data as any;
        const bits: string[] = [];
        if (p.material) bits.push(p.material);
        if (p.colors?.length > 0) bits.push(p.colors.join(", "));
        const detail = bits.length > 0 ? `, ${bits.join(", ")}` : "";
        return `${p.name} ($${p.price}, ${r.type}${detail})`;
      })
      .join("; ");
    parts.push(`[RAG_CONTEXT: Relevant catalog items: ${ragSummary}]`);
  }

  // Layer 2: Session Context
  if (sessionState.cart.length > 0 || sessionState.lastViewed) {
    const sessionParts: string[] = [];
    if (sessionState.cart.length > 0) {
      sessionParts.push(`cart contains ${sessionState.cart.join(", ")}`);
    }
    if (sessionState.lastViewed) {
      sessionParts.push(`last viewed ${sessionState.lastViewed}`);
    }
    if (sessionState.currentPath) {
      sessionParts.push(`on ${sessionState.currentPath} page`);
    }
    parts.push(`[SESSION: User ${sessionParts.join(", ")}]`);
  }

  // Layer 3: Client profile & purchase history
  if (customerProfile) {
    const profileBits: string[] = [`${customerProfile.name}`];
    if (customerProfile.loyaltyTier) profileBits.push(`${customerProfile.loyaltyTier} member`);
    if (customerProfile.stylePreference) profileBits.push(`style: ${customerProfile.stylePreference}`);
    if (customerProfile.preferredSizes?.length) profileBits.push(`preferred sizes ${customerProfile.preferredSizes.join(", ")}`);

    const pastOrders = getOrdersByCustomer(customerProfile.id).slice(-3);
    let profileText = `[PROFILE: ${profileBits.join("; ")}.`;
    if (pastOrders.length > 0) {
      const names = pastOrders
        .map((o) => findProductById(o.itemId)?.name)
        .filter(Boolean)
        .join(", ");
      if (names) profileText += ` Past purchases: ${names}.`;
    }
    profileText += "]";
    parts.push(profileText);
  }

  return parts.join("\n");
}
