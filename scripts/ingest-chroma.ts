import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { products } from "../src/data/mock-database";
import { Product } from "../src/types";
import { ingestProducts, CatalogProduct } from "../src/lib/chroma-store";

function buildDescription(product: Product): string {
  const extras: string[] = [];
  if (product.material) extras.push(product.material);
  if (product.colors && product.colors.length > 0) {
    extras.push(product.colors.join(", "));
  }
  if (extras.length > 0) {
    return `${product.description} (${extras.join("; ")}).`;
  }
  return product.description;
}

function buildFeatures(product: Product): string[] {
  const features: (string | null | undefined)[] = [
    product.category,
    product.description,
    product.designer,
    product.material,
    product.fit,
    ...(product.colors || []),
    ...(product.sizes || []),
    ...product.tags,
  ];

  return features.filter((feature): feature is string => Boolean(feature));
}

function toCatalogProduct(product: Product): CatalogProduct {
  return {
    id: product.id,
    title: product.name,
    description: buildDescription(product),
    category: product.category,
    price: product.price,
    stockCount: product.stockCount,
    features: buildFeatures(product),
    type: product.category,
  };
}

async function main(): Promise<void> {
  const catalog: CatalogProduct[] = products.map(toCatalogProduct);

  const count = await ingestProducts(catalog);
  console.log(`Ingested ${count} products into ChromaDB`);
}

main().catch((error) => {
  console.error("Failed to ingest products:", error);
  process.exit(1);
});
