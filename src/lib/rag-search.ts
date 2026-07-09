import { products, findProductById } from "@/data/mock-database";
import { queryCatalog, embedText, CatalogQueryResult } from "@/lib/chroma-store";
import { RagSearchResult, Product } from "@/types";

function stem(word: string): string {
  // Simple English stemmer: handle common plurals and suffixes
  if (word.endsWith("ies") && word.length > 4) return word.slice(0, -3) + "y";
  if (word.endsWith("es") && word.length > 3) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) return word.slice(0, -1);
  if (word.endsWith("ing") && word.length > 4) return word.slice(0, -3);
  if (word.endsWith("ed") && word.length > 3) return word.slice(0, -2);
  return word;
}

function tokenize(text: string): string[] {
  const raw = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);

  // Add stemmed versions and fashion synonyms / occasion mapping
  const stemmed = raw.map(stem);
  const synonyms: string[] = [];
  for (const word of raw) {
    if (word.startsWith("accessor")) synonyms.push("accessories", "scarf", "sunglasses", "watch", "jewellery");
    // Category synonyms
    if (["dress", "gown", "frock"].includes(word)) synonyms.push("women", "dress", "occasion");
    if (["coat", "jacket", "trench", "overcoat", "outerwear", "blazer"].includes(word)) synonyms.push("outerwear", "coat");
    if (["shoe", "shoes", "heels", "heel", "pumps", "sneakers", "trainers", "boots", "derby"].includes(word)) synonyms.push("shoes");
    if (["bag", "bags", "handbag", "purse", "tote", "satchel", "clutch"].includes(word)) synonyms.push("bags", "handbag");
    if (["jewellery", "jewelry", "necklace", "pendant", "pearl", "pearls", "ring", "earrings"].includes(word)) synonyms.push("accessories", "jewellery");
    if (["knit", "knitwear", "sweater", "jumper", "poncho", "cashmere"].includes(word)) synonyms.push("knitwear", "cashmere");
    if (["men", "mens", "man", "him", "his", "menswear"].includes(word)) synonyms.push("men", "menswear");
    if (["women", "womens", "woman", "her", "hers", "ladies", "womenswear"].includes(word)) synonyms.push("women", "womenswear");
    // Occasion mapping
    if (["wedding", "gala", "black", "formal", "evening", "party", "cocktail", "dinner"].includes(word)) synonyms.push("occasion", "evening", "gown", "dress");
    if (["office", "work", "business", "meeting", "professional"].includes(word)) synonyms.push("office", "tailoring", "trousers", "shirt");
    if (["weekend", "casual", "everyday", "relaxed", "off"].includes(word)) synonyms.push("casual", "everyday", "denim", "tee");
    if (["winter", "cold", "warm", "cozy", "cosy"].includes(word)) synonyms.push("winter", "coat", "cashmere", "knitwear");
    if (["summer", "resort", "holiday", "vacation", "beach"].includes(word)) synonyms.push("summer", "dress", "sunglasses");
    // Price intent
    if (["cheap", "cheapest", "budget", "affordable", "value"].includes(word)) synonyms.push("budget", "everyday");
    if (["luxury", "premium", "designer", "statement", "special"].includes(word)) synonyms.push("statement", "occasion");
    // Gifts / stylist
    if (["gift", "present", "gifts"].includes(word)) synonyms.push("gift", "accessories");
    if (["stylist", "advisor", "help", "support"].includes(word)) synonyms.push("stylist");
  }
  return Array.from(new Set([...raw, ...stemmed, ...synonyms]));
}

function jaccardSimilarity(setA: string[], setB: string[]): number {
  if (setA.length === 0 || setB.length === 0) return 0;
  const uniqueA = Array.from(new Set(setA));
  const uniqueB = Array.from(new Set(setB));
  let intersection = 0;
  for (let i = 0; i < uniqueA.length; i++) {
    if (uniqueB.indexOf(uniqueA[i]) !== -1) intersection++;
  }
  const combined = uniqueA.concat(
    uniqueB.filter((item) => uniqueA.indexOf(item) === -1)
  );
  const union = combined.length;
  return union === 0 ? 0 : intersection / union;
}

function cosineSimilarity(queryTokens: string[], docTokens: string[]): number {
  if (queryTokens.length === 0 || docTokens.length === 0) return 0;
  const queryFreq = new Map<string, number>();
  const docFreq = new Map<string, number>();

  for (let i = 0; i < queryTokens.length; i++) {
    const t = queryTokens[i];
    queryFreq.set(t, (queryFreq.get(t) || 0) + 1);
  }
  for (let i = 0; i < docTokens.length; i++) {
    const t = docTokens[i];
    docFreq.set(t, (docFreq.get(t) || 0) + 1);
  }

  const allTerms = Array.from(
    new Set(Array.from(queryFreq.keys()).concat(Array.from(docFreq.keys())))
  );
  let dotProduct = 0;
  let queryMag = 0;
  let docMag = 0;

  for (let i = 0; i < allTerms.length; i++) {
    const term = allTerms[i];
    const q = queryFreq.get(term) || 0;
    const d = docFreq.get(term) || 0;
    dotProduct += q * d;
    queryMag += q * q;
    docMag += d * d;
  }

  const mag = Math.sqrt(queryMag) * Math.sqrt(docMag);
  return mag === 0 ? 0 : dotProduct / mag;
}

function buildDocTokens(product: Product): string[] {
  const tokens: string[] = [
    ...tokenize(product.name),
    ...tokenize(product.description),
    ...product.tags,
    product.category,
    `${product.price}`,
  ];

  if (product.designer) tokens.push(...tokenize(product.designer));
  if (product.material) tokens.push(...tokenize(product.material));
  if (product.fit) tokens.push(...tokenize(product.fit));
  if (product.colors) {
    tokens.push(...product.colors.flatMap((c) => tokenize(c)));
  }
  if (product.sizes) {
    tokens.push(...product.sizes.map((s) => s.toLowerCase()));
  }

  return tokens;
}

function scoreProduct(queryTokens: string[], product: Product): number {
  const docTokens = buildDocTokens(product);
  const jaccard = jaccardSimilarity(queryTokens, docTokens);
  const cosine = cosineSimilarity(queryTokens, docTokens);
  return jaccard * 0.4 + cosine * 0.6;
}

export function keywordSearch(
  query: string,
  topK: number = 5,
  scoreThreshold: number = 0.05
): RagSearchResult[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const results: RagSearchResult[] = [];

  for (const product of products) {
    const score = scoreProduct(queryTokens, product);
    if (score > scoreThreshold) {
      results.push({
        id: product.id,
        name: product.name,
        type: product.category,
        score,
        data: product,
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}

// Same as keyword search but with a lower threshold for broader matching
export function searchCatalogWithDetails(
  query: string,
  topK: number = 5
): RagSearchResult[] {
  return keywordSearch(query, topK, 0.01);
}

function mapCatalogResult(result: CatalogQueryResult): RagSearchResult | null {
  if (result.score < -0.9) {
    return null;
  }

  const data = findProductById(result.id);
  if (!data) {
    return null;
  }

  return {
    id: result.id,
    name: result.title,
    type: data.category,
    score: result.score,
    data,
  };
}

export async function searchCatalog(
  query: string
): Promise<RagSearchResult[]> {
  try {
    const vectorResults = await queryCatalog(query, 5);

    const results = vectorResults
      .map(mapCatalogResult)
      .filter((r): r is RagSearchResult => r !== null);

    if (results.length > 0) {
      results.sort((a, b) => b.score - a.score);
      return results;
    }
  } catch (error) {
    console.warn(
      "Vector search unavailable, falling back to keyword search:",
      (error as Error).message
    );
  }
  return keywordSearch(query, 5, 0.01);
}
