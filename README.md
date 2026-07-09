# MAISON LUXE — AI Personal Shopping Stylist

A production-grade RAG (Retrieval-Augmented Generation) shopping assistant for a high-end fashion house. It answers client questions about ready-to-wear, outerwear, shoes, handbags and accessories — and styles complete looks — by retrieving relevant catalogue pieces from a ChromaDB vector database, layering in session and purchase-history context, and generating grounded responses with AWS Bedrock.

> This storefront and its imagery are an original demo build. Photography is royalty-free (Unsplash) and stored locally in `public/images`. The brand "Maison Luxe" is fictional. Drop in your own brand, products and photography by editing `src/data/mock-database.ts` and the files in `public/images`.

## How the RAG Works

### The Problem

Without RAG, an LLM would either:
- Hallucinate products, prices, and materials that don't exist
- Dump the entire catalogue into the prompt (wasting tokens, hitting limits)
- Have no access to your specific product data at all

### The Solution: True RAG Pipeline

Our RAG implementation ensures the LLM **only sees pieces relevant to the client's query**, grounded in real catalogue data.

#### Step 1: Seed the Vector Database (Offline)

```
scripts/seed.mjs
    │
    ├── Read products from mock-database.ts (fashion catalogue)
    │
    ├── For each piece, generate a text document:
    │   "Ivory Off-Shoulder Silk Dress. A fluid off-shoulder dress...
    │    Category: women. Price: $890. Tags: dress, silk, wedding..."
    │
    ├── Embed each document using Amazon Titan Embeddings V2
    │   (amazon.titan-embed-text-v2:0 → 1024-dimensional vectors)
    │
    └── Upsert into ChromaDB "shopping-catalog" collection
        (vectors + metadata stored for fast similarity search)
```

#### Step 2: Query-Time RAG (Runtime)

```
Client: "I need a dress for a summer wedding"
    │
    ├── 1. EMBED THE QUERY  (Titan Embeddings V2 → 1024-dim vector)
    │
    ├── 2. VECTOR SEARCH (ChromaDB)
    │   Cosine similarity against all catalogue vectors
    │   Returns the most relevant pieces (dresses, then shoes/bags to style)
    │
    ├── 3. INJECT INTO PROMPT
    │   [RETRIEVED PRODUCTS — use only these for recommendations]
    │   [WOMEN] Ivory Off-Shoulder Silk Dress — $890 (100% Silk; Ivory)...
    │   [SHOES] Navy Suede Point-Toe Pumps — $650 ...
    │   ...
    │
    └── 4. LLM GENERATES RESPONSE (Amazon Nova Micro)
        - System prompt (stylist behaviour rules only — no product data)
        - Retrieved pieces (only relevant ones)
        - Client message
        → Grounded response that styles a look using ONLY retrieved pieces
```

### The 3-Layer Context System

```
Layer 1: CATALOG RAG (vector search) — "Which pieces match this query?"
Layer 2: SESSION CONTEXT (request body) — "What is the client viewing / in the bag?"
Layer 3: CLIENT PROFILE (mock database) — loyalty tier, sizes, style, past purchases
         │
         ▼
    Combined into a single prompt context sent to Amazon Nova Micro (Bedrock Converse API)
```

### Keyword Search Fallback

If ChromaDB (or AWS) is unavailable, the system falls back to a local keyword search engine that uses Jaccard (40%) + Cosine (60%) similarity, stemming, and a fashion synonym / occasion map (e.g. "wedding" → eveningwear, "office" → tailoring). This means **the demo runs with zero AWS setup** — you can start it and chat immediately, then wire in Bedrock later for the full LLM.

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | 18.x or 20.x LTS | https://nodejs.org |
| **npm** | ships with Node.js | — |
| **Docker Desktop** | latest | Only needed for the ChromaDB vector path |
| **AWS credentials** | Bedrock access (optional) | For the full LLM path — `bedrock:InvokeModel` for `amazon.nova-micro-v1:0` and `amazon.titan-embed-text-v2:0` |

You can run the whole storefront and the stylist **without Docker or AWS** thanks to the keyword-search fallback. Add them for the full vector + LLM experience.

## Setup

```bash
npm install
cp .env.local.example .env.local     # add AWS keys here for the full LLM path (optional)
npm run dev                          # start the app on http://localhost:3000
```

Optional — full vector + LLM path:

```bash
docker compose up -d chromadb        # start ChromaDB
npm run seed                         # embed the catalogue into ChromaDB (needs AWS keys)
```

Open `http://localhost:3000`. Admin / escalation panel: `http://localhost:3000/admin`.

## Product Catalogue

An original luxury fashion catalogue across 6 categories:

| Category | Examples |
|----------|---------|
| **Women's Ready-to-Wear** | Ivory Off-Shoulder Silk Dress, Scarlet Draped Evening Gown, Pinstripe Wide-Leg Trousers |
| **Men's Ready-to-Wear** | Pima Cotton Tee, Merino Crewneck, Italian Oxford Shirt, Slim Tapered Jeans |
| **Coats & Outerwear** | Burgundy Wool Wrap Coat, Cerulean Trench, Cognac Leather Biker Jacket |
| **Shoes** | Floral Stiletto Pumps, Navy Suede Pumps, Hand-Welted Derby, Runner Sneakers |
| **Handbags** | Scarlet Top-Handle Bag, Floral Top-Handle Bag, Teal Mini Satchel |
| **Accessories & Fine Jewellery** | Pearl Necklace, 18k Gold Pendant, Round Sunglasses, Leather-Strap Watch, Cashmere Scarf |

Each piece carries fashion attributes — designer/atelier, material, colours, sizes, fit, and a "frequently styled with" list that powers the "Complete the Look" cross-sell.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS (Playfair Display / Cormorant serif, luxe palette) |
| LLM | AWS Bedrock — Amazon Nova Micro (`amazon.nova-micro-v1:0`) |
| Embeddings | AWS Bedrock — Amazon Titan Embeddings V2 (1024-dim) |
| Vector DB | ChromaDB (Docker, port 8000) |
| Voice | Web Speech API (browser-native, free) |
| Fallback Search | Jaccard + Cosine similarity (keyword-based, fashion synonyms) |

## Where the Domain Lives (telecom → fashion conversion notes)

The architecture is domain-agnostic. Everything specific to the store lives in:

| File | Role |
|------|------|
| `src/data/mock-database.ts` | The catalogue, client profiles and orders |
| `src/lib/bedrock-client.ts` | Stylist system prompt + RAG context formatting |
| `src/lib/rag-search.ts` | Fashion synonyms / occasion mapping + scoring |
| `src/components/FashionStore.tsx` | The storefront homepage |
| `src/components/ProductCard.tsx` | Product tile + fashion category labels |
| `src/app/product/[id]/page.tsx` | Product detail page + "Complete the Look" |
| `public/images/` | Local royalty-free imagery |

Swap those and the same RAG pipeline powers any retail vertical.

## API Endpoints

### `POST /api/assistant`

Main chat endpoint. Request `{ "message": "...", "sessionState": { "cart": [], "currentPath": "/", "lastViewed": null } }` → returns a grounded `response`, matched `products`, `suggestions`, and `handoff` status.

### `POST /api/webhook/escalation` / `GET /api/webhook/escalation`

Stores escalation payloads and returns the escalation queue.

## Escalation System

Triggered by keyword detection ("speak to a stylist", "talk to a human", "advisor", etc.) or by the LLM returning `__ESCALATE__`. On trigger the system stores the escalation with transcript history, forwards to an external webhook if configured, and shows it in the admin panel at `/admin`.

## License

Internal / demo use only.
