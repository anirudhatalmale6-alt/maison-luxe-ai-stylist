"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { useStore } from "@/context/StoreContext";
import { products } from "@/data/mock-database";
import { Product, ProductCategory } from "@/types";
import { formatPriceUSD } from "@/components/ProductCard";

const categoryLabels: Record<ProductCategory, string> = {
  women: "Womenswear",
  men: "Menswear",
  outerwear: "Outerwear",
  shoes: "Shoes",
  bags: "Handbags",
  accessories: "Accessories",
};

export default function ProductDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : undefined;
  const { addToCart, cart, setLastViewed } = useStore();

  const product: Product | undefined = id
    ? products.find((p) => p.id === id)
    : undefined;

  useEffect(() => {
    if (product) {
      setLastViewed(product.name);
    }
  }, [product, setLastViewed]);

  if (!product) {
    return (
      <div className="min-h-screen bg-white">
        <nav className="border-b border-luxe-mist px-6 py-5">
          <div className="max-w-7xl mx-auto text-center">
            <Link href="/" className="font-serif text-2xl tracking-[0.35em] text-luxe-ink">MAISON&nbsp;LUXE</Link>
          </div>
        </nav>
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <h1 className="font-serif text-3xl text-luxe-ink mb-4">Piece Not Found</h1>
          <p className="text-luxe-taupe mb-8">We couldn&apos;t find that piece in the collection.</p>
          <Link href="/" className="inline-block bg-luxe-ink text-white text-[11px] uppercase tracking-[0.22em] px-8 py-3.5 hover:bg-luxe-gold transition-colors">
            Return to the Collection
          </Link>
        </div>
      </div>
    );
  }

  const inCart = cart.includes(product.name);
  const related = products
    .filter((p) => (product.frequentlyBundledWith || []).includes(p.id))
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-white text-luxe-ink">
      {/* Header */}
      <header className="border-b border-luxe-mist px-6 py-5 sticky top-0 bg-white z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-[11px] uppercase tracking-[0.18em] text-luxe-taupe hover:text-luxe-ink transition-colors">← Collection</Link>
          <Link href="/" className="font-serif text-2xl tracking-[0.35em] text-luxe-ink">MAISON&nbsp;LUXE</Link>
          <div className="relative">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.4} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            {cart.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-luxe-gold text-white text-[9px] font-semibold rounded-full flex items-center justify-center">{cart.length}</span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="overflow-hidden bg-luxe-mist">
            <img src={product.image} alt={product.name} className="w-full h-auto object-cover" />
          </div>

          <div className="flex flex-col lg:pt-6">
            <span className="text-[11px] uppercase tracking-[0.22em] text-luxe-gold">
              {categoryLabels[product.category]}
              {product.designer ? ` · ${product.designer}` : ""}
            </span>
            <h1 className="mt-3 font-serif text-3xl md:text-4xl leading-tight text-luxe-ink">{product.name}</h1>
            <p className="mt-4 text-xl text-luxe-ink tracking-wide">{formatPriceUSD(product.price)}</p>
            <p className="mt-6 text-[15px] leading-relaxed text-luxe-taupe">{product.description}</p>

            {/* Attributes */}
            <dl className="mt-8 space-y-3 text-sm border-t border-luxe-mist pt-6">
              {product.material && (
                <div className="flex gap-4">
                  <dt className="w-28 uppercase text-[11px] tracking-[0.15em] text-luxe-taupe pt-0.5">Material</dt>
                  <dd className="text-luxe-ink">{product.material}</dd>
                </div>
              )}
              {product.colors && product.colors.length > 0 && (
                <div className="flex gap-4">
                  <dt className="w-28 uppercase text-[11px] tracking-[0.15em] text-luxe-taupe pt-0.5">Colour</dt>
                  <dd className="text-luxe-ink">{product.colors.join(", ")}</dd>
                </div>
              )}
              {product.fit && (
                <div className="flex gap-4">
                  <dt className="w-28 uppercase text-[11px] tracking-[0.15em] text-luxe-taupe pt-0.5">Fit</dt>
                  <dd className="text-luxe-ink">{product.fit}</dd>
                </div>
              )}
              {product.sizes && product.sizes.length > 0 && (
                <div className="flex gap-4">
                  <dt className="w-28 uppercase text-[11px] tracking-[0.15em] text-luxe-taupe pt-0.5">Sizes</dt>
                  <dd className="flex flex-wrap gap-2">
                    {product.sizes.map((s) => (
                      <span key={s} className="min-w-[2.25rem] text-center border border-luxe-mist px-2 py-1 text-[13px] text-luxe-ink hover:border-luxe-ink transition-colors cursor-pointer">
                        {s}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>

            <button
              onClick={() => addToCart(product.name)}
              disabled={inCart}
              className={`mt-9 w-full py-4 text-[11px] uppercase tracking-[0.22em] transition-colors ${
                inCart ? "bg-luxe-ink/90 text-white cursor-default" : "bg-luxe-ink text-white hover:bg-luxe-gold"
              }`}
            >
              {inCart ? "Added to Your Bag" : "Add to Bag"}
            </button>
            <p className="mt-4 text-[12px] tracking-[0.1em] text-luxe-taupe text-center">
              Complimentary shipping &amp; returns · {product.stockCount} in stock
            </p>
          </div>
        </div>

        {/* Complete the look */}
        {related.length > 0 && (
          <section className="mt-24">
            <div className="text-center mb-10">
              <h2 className="font-serif text-2xl text-luxe-ink">Complete the Look</h2>
              <div className="mt-3 w-12 h-px bg-luxe-gold mx-auto" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10 max-w-4xl mx-auto">
              {related.map((p) => (
                <Link key={p.id} href={`/product/${p.id}`} className="group block text-center">
                  <div className="aspect-[4/5] overflow-hidden bg-luxe-mist">
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  </div>
                  <h3 className="mt-3 font-serif text-[15px] text-luxe-ink">{p.name}</h3>
                  <p className="mt-1 text-sm text-luxe-taupe">{formatPriceUSD(p.price)}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
