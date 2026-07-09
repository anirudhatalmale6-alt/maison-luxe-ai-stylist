import { ProductCard, Product, RagSearchResult } from "@/types";
import { products } from "@/data/mock-database";

export function formatProductDescription(result: RagSearchResult): string {
  const product = result.data as Product;

  const attrs: string[] = [];
  if (product.material) attrs.push(product.material);
  if (product.colors && product.colors.length > 0) {
    attrs.push(product.colors.join(", "));
  }
  if (attrs.length > 0) {
    return `${product.description} (${attrs.join("; ")})`;
  }
  return product.description;
}

function toCard(product: Product): ProductCard {
  return {
    id: product.id,
    name: product.name,
    type: product.category,
    price: product.price,
    image: product.image,
    description: product.description,
    url: `/product/${product.id}`,
  };
}

// Extract meaningful keywords (length > 3, excluding stopwords) from a product name
function nameKeywords(name: string): string[] {
  const stop = new Set([
    "with", "and", "the", "plus", "pro", "max", "ultra", "plan", "lite",
  ]);
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stop.has(w));
}

// Match products the LLM actually mentioned in its response.
export function buildProductCards(
  results: RagSearchResult[],
  llmResponse?: string
): ProductCard[] {
  // Build a lookup of all catalog products by id for fast access
  const byId = new Map<string, Product>();
  for (const r of results) byId.set(r.id, r.data as Product);
  for (const p of products) byId.set(p.id, p);

  if (!llmResponse) {
    return results.slice(0, 3).map((r) => toCard(r.data as Product));
  }

  const lower = llmResponse.toLowerCase();
  const matched: Product[] = [];

  for (const p of Array.from(byId.values())) {
    const full = p.name.toLowerCase();
    const keywords = nameKeywords(p.name);

    // Match if the full name appears, or at least 2 meaningful keywords appear
    const keywordHits = keywords.filter((k) => lower.includes(k)).length;
    const isMatch =
      lower.includes(full) || (keywords.length >= 2 && keywordHits >= 2);

    if (isMatch && !matched.find((m) => m.id === p.id)) {
      matched.push(p);
    }
  }

  // If the LLM mentioned products, show exactly those (deduped, max 4)
  if (matched.length > 0) {
    return matched.slice(0, 4).map(toCard);
  }

  // Fallback: show top retrieved products
  return results.slice(0, 3).map((r) => toCard(r.data as Product));
}
