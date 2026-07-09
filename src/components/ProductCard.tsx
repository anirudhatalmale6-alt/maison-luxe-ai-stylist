"use client";

import Link from "next/link";
import { ProductCard as ProductCardType, ProductCategory } from "@/types";

interface ProductCardProps {
  product: ProductCardType;
  onAddToCart?: (name: string) => void;
  inCart?: boolean;
  compact?: boolean;
}

const categoryLabels: Record<ProductCategory, string> = {
  women: "Womenswear",
  men: "Menswear",
  outerwear: "Outerwear",
  shoes: "Shoes",
  bags: "Handbags",
  accessories: "Accessories",
};

export function formatPriceUSD(value: number): string {
  return `$${value.toLocaleString("en-US")}`;
}

export function ProductCard({
  product,
  onAddToCart,
  inCart = false,
  compact = false,
}: ProductCardProps) {
  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onAddToCart?.(product.name);
  };

  return (
    <Link
      href={product.url}
      className={`group block bg-white overflow-hidden ${
        compact ? "max-w-[200px]" : ""
      }`}
    >
      <div className="relative overflow-hidden aspect-[4/5] bg-luxe-mist">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <span className="absolute top-3 left-3 inline-flex items-center px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-luxe-ink bg-white/85 backdrop-blur-sm">
          {categoryLabels[product.type]}
        </span>
        {onAddToCart && (
          <button
            onClick={handleAddToCart}
            disabled={inCart}
            className={`absolute bottom-0 inset-x-0 py-3 text-[11px] font-medium uppercase tracking-[0.2em] transition-all duration-300 translate-y-full group-hover:translate-y-0 ${
              inCart
                ? "bg-luxe-ink/90 text-white cursor-default"
                : "bg-luxe-ink text-white hover:bg-luxe-gold hover:text-luxe-ink"
            }`}
          >
            {inCart ? "In Your Edit" : "Add to Bag"}
          </button>
        )}
      </div>

      <div className={`${compact ? "pt-3" : "pt-4"} text-center`}>
        <p className="text-[10px] uppercase tracking-[0.18em] text-luxe-taupe">
          {product.name.includes("—") ? "" : ""}
        </p>
        <h3
          className={`font-serif text-luxe-ink leading-snug line-clamp-2 ${
            compact ? "text-sm px-1" : "text-[15px]"
          }`}
        >
          {product.name}
        </h3>
        <p
          className={`mt-1.5 text-luxe-ink tracking-wide ${
            compact ? "text-xs" : "text-sm"
          }`}
        >
          {formatPriceUSD(product.price)}
        </p>
      </div>
    </Link>
  );
}
