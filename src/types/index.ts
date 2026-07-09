export type ProductCategory =
  | "women"
  | "men"
  | "outerwear"
  | "shoes"
  | "bags"
  | "accessories";

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: ProductCategory;
  description: string;
  inStock: boolean;
  stockCount: number;
  tags: string[];
  // Fashion attributes
  designer?: string;
  material?: string;
  sizes?: string[];
  colors?: string[];
  fit?: string;
  frequentlyBundledWith?: string[];
}

export interface ProductCard {
  id: string;
  name: string;
  type: ProductCategory;
  price: number;
  image: string;
  description: string;
  url: string;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  // Fashion personalization
  loyaltyTier?: "Insider" | "Silver" | "Gold" | "Private Client";
  favoriteCategories?: ProductCategory[];
  preferredSizes?: string[];
  stylePreference?: string;
  lastPurchaseDate?: string | null;
}

export interface OrderHistory {
  id: string;
  customerId: string;
  itemId: string;
  itemType: string;
  purchaseDate: string;
  status: "active" | "delivered" | "cancelled";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  products?: ProductCard[];
}

export interface SessionState {
  cart: string[];
  currentPath: string;
  lastViewed: string | null;
}

export interface EscalationPayload {
  agent_escalation: boolean;
  customer_name: string;
  customer_id: string;
  transcript_history: string[];
  active_session: SessionState;
  escalation_id: string;
  timestamp: number;
}

export interface RagSearchResult {
  id: string;
  name: string;
  type: ProductCategory;
  score: number;
  data: Product;
}

export interface BedrockAgentResponse {
  completion: string;
  sessionId: string;
}

export interface CartItem {
  id: string;
  title: string;
  quantity: number;
}

export interface LastViewedItem {
  id: string;
  title: string;
}

export interface AssistantRequest {
  message: string;
  sessionId?: string;
  sessionState?: SessionState;
  cart?: CartItem[];
  currentPath?: string;
  lastViewed?: LastViewedItem;
  voice?: boolean;
  history?: { role: "user" | "assistant"; content: string }[];
}

export interface AssistantResponse {
  response: string;
  context: string;
  suggestions: string[];
  handoff: boolean;
  cartSuggestions: CartItem[];
  products?: ProductCard[];
  escalationId?: string;
}
