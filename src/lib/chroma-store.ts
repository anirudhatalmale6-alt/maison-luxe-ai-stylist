/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const CHROMADB_URL = process.env.CHROMADB_URL || "http://127.0.0.1:8000";
const CHROMA_COLLECTION_NAME =
  process.env.CHROMA_COLLECTION_NAME || "shopping-catalog";
const EMBEDDING_MODEL =
  process.env.EMBEDDING_MODEL || "text-embedding-3-small";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_EMBEDDING_MODEL =
  process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text";
const TITAN_EMBEDDING_MODEL =
  process.env.TITAN_EMBEDDING_MODEL || "amazon.titan-embed-text-v2:0";
const CHROMADB_TIMEOUT_MS = 3000;
const OLLAMA_TIMEOUT_MS = 5000;
const TITAN_TIMEOUT_MS = 10000;

const AWS_CONFIGURED = !!(
  process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
);

function withTimeout<T>(
  promise: Promise<T>,
  label: string,
  timeoutMs: number = CHROMADB_TIMEOUT_MS
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

export interface CatalogProduct {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  stockCount: number;
  features: string[];
  type: string;
}

export interface CatalogQueryResult extends CatalogProduct {
  score: number;
}

export async function getChromaClient(): Promise<any> {
  try {
    const chroma = await import(/* webpackIgnore: true */ "chromadb");
    return new chroma.ChromaClient({ path: CHROMADB_URL });
  } catch (error) {
    throw new Error(
      "ChromaDB package is unavailable. Install it with `npm install chromadb`."
    );
  }
}

export async function getOpenAIClient(): Promise<any> {
  try {
    const { default: OpenAI } = await import(/* webpackIgnore: true */ "openai");
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  } catch (error) {
    throw new Error(
      "OpenAI package is unavailable. Install it with `npm install openai`."
    );
  }
}

let bedrockClient: BedrockRuntimeClient | null = null;

function getBedrockRuntimeClient(): BedrockRuntimeClient {
  if (!bedrockClient) {
    bedrockClient = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: AWS_CONFIGURED
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
          }
        : undefined,
    });
  }
  return bedrockClient;
}

async function embedTextWithTitan(text: string): Promise<number[]> {
  const client = getBedrockRuntimeClient();
  const command = new InvokeModelCommand({
    modelId: TITAN_EMBEDDING_MODEL,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      inputText: text,
      dimensions: 1024,
      normalize: true,
    }),
  });

  const response = await withTimeout(client.send(command), "Titan embedding", TITAN_TIMEOUT_MS);
  const body = JSON.parse(new TextDecoder().decode(response.body));

  if (!Array.isArray(body.embedding)) {
    throw new Error("Titan response did not contain a valid embedding.");
  }
  return body.embedding as number[];
}

async function embedTextWithOllama(text: string): Promise<number[]> {
  const response = await withTimeout(
    fetch(`${OLLAMA_URL}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_EMBEDDING_MODEL,
        prompt: text,
      }),
    }),
    "Ollama embedding",
    OLLAMA_TIMEOUT_MS
  );

  if (!response.ok) {
    throw new Error(`Ollama returned ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as { embedding?: number[] };
  if (!Array.isArray(data.embedding)) {
    throw new Error("Ollama response did not contain a valid embedding.");
  }
  return data.embedding;
}

async function embedTextWithOpenAI(text: string): Promise<number[]> {
  const openai = await getOpenAIClient();
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  const embedding = response.data?.[0]?.embedding;
  if (!Array.isArray(embedding)) {
    throw new Error("OpenAI embedding response did not contain a valid embedding.");
  }
  return embedding as number[];
}

export async function embedText(text: string): Promise<number[]> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Cannot embed empty text.");
  }

  // Titan embeddings only — Ollama/OpenAI not configured
  return embedTextWithTitan(trimmed);
}

function buildProductDocument(product: CatalogProduct): string {
  return `${product.title}. ${product.description}. Category: ${product.category}. Price: $${product.price}. Features: ${product.features.join(", ")}. Type: ${product.type}.`;
}

export async function getCollection(): Promise<any> {
  const client = await getChromaClient();
  try {
    return await withTimeout(
      client.getOrCreateCollection({
        name: CHROMA_COLLECTION_NAME,
        metadata: { description: "Shopping catalog embeddings" },
      }),
      "ChromaDB getOrCreateCollection"
    );
  } catch (error) {
    console.warn(
      "Failed to get or create ChromaDB collection:",
      (error as Error).message
    );
    throw error;
  }
}

export async function ingestProducts(
  products: CatalogProduct[]
): Promise<number> {
  if (products.length === 0) {
    return 0;
  }

  const collection = await getCollection();
  const BATCH_SIZE = 50;
  let ingested = 0;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const ids = batch.map((product) => product.id);
    const documents = batch.map(buildProductDocument);
    const metadatas = batch.map((product) => ({
      id: product.id,
      title: product.title,
      description: product.description,
      category: product.category,
      price: product.price,
      stockCount: product.stockCount,
      features: product.features.join(", "),
      type: product.type,
    }));
    const embeddings = await Promise.all(
      documents.map((document) => embedText(document))
    );

    try {
      await withTimeout(
        collection.upsert({ ids, embeddings, metadatas, documents }),
        "ChromaDB upsert"
      );
      ingested += batch.length;
    } catch (error) {
      console.warn(
        `Failed to ingest batch starting at index ${i}:`,
        (error as Error).message
      );
      throw error;
    }
  }

  return ingested;
}

export async function queryCatalog(
  query: string,
  topK = 3
): Promise<CatalogQueryResult[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const collection = await getCollection();
  const embedding = await embedText(trimmed);

  try {
    const result: any = await withTimeout(
      collection.query({
        queryEmbeddings: [embedding],
        nResults: topK,
        include: ["metadatas", "documents", "distances"],
      }),
      "ChromaDB query"
    );

    const ids: string[] = result.ids?.[0] ?? [];
    const metadatas: any[] = result.metadatas?.[0] ?? [];
    const distances: number[] = result.distances?.[0] ?? [];

    return ids.map((id: string, index: number) => {
      const meta = metadatas[index] || {};
      const distance =
        typeof distances[index] === "number" ? distances[index] : 0;
      const features =
        typeof meta.features === "string"
          ? meta.features.split(", ")
          : [];

      return {
        id,
        title: String(meta.title ?? ""),
        description: String(meta.description ?? ""),
        category: String(meta.category ?? ""),
        price: Number(meta.price ?? 0),
        stockCount: Number(meta.stockCount ?? 0),
        features,
        type: String(meta.type ?? ""),
        score: 1 - distance,
      };
    });
  } catch (error) {
    console.warn("Failed to query catalog:", (error as Error).message);
    throw error;
  }
}
