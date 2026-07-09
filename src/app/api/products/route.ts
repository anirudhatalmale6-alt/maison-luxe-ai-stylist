import { NextRequest, NextResponse } from "next/server";
import { products } from "@/data/mock-database";
import { Product } from "@/types";

export interface UnifiedProduct {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  stockCount: number;
  features: string[];
  type: string;
}

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

function toUnified(product: Product): UnifiedProduct {
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

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const unifiedProducts: UnifiedProduct[] = products.map(toUnified);

  const response = NextResponse.json(
    {
      products: unifiedProducts,
      count: unifiedProducts.length,
    },
    { status: 200 }
  );

  response.headers.set(
    "Cache-Control",
    "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
  );

  return response;
}
