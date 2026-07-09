"use client";

import { useStore } from "@/context/StoreContext";
import { useAssistant } from "@/context/AssistantContext";
import { products } from "@/data/mock-database";
import { ProductCard as ProductCardType, ProductCategory } from "@/types";
import { ProductCard } from "./ProductCard";

const categoryOrder: ProductCategory[] = [
  "women",
  "men",
  "outerwear",
  "shoes",
  "bags",
  "accessories",
];

const categoryTitles: Record<ProductCategory, string> = {
  women: "Women's Ready-to-Wear",
  men: "Men's Ready-to-Wear",
  outerwear: "Coats & Outerwear",
  shoes: "Shoes",
  bags: "Handbags",
  accessories: "Accessories & Fine Jewellery",
};

const categoryTiles: { category: ProductCategory; label: string; image: string }[] = [
  { category: "women", label: "Women", image: "/images/f06.jpg" },
  { category: "men", label: "Men", image: "/images/f16.jpg" },
  { category: "outerwear", label: "Outerwear", image: "/images/f03.jpg" },
  { category: "shoes", label: "Shoes", image: "/images/heel1.jpg" },
  { category: "bags", label: "Handbags", image: "/images/bag1.jpg" },
  { category: "accessories", label: "Jewellery", image: "/images/jewel2.jpg" },
];

function toProductCard(product: (typeof products)[0]): ProductCardType {
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

export function FashionStore() {
  const { addToCart, cart, setLastViewed } = useStore();
  const { setIsOpen } = useAssistant();

  const productsByCategory = categoryOrder.map((category) => ({
    category,
    title: categoryTitles[category],
    items: products.filter((p) => p.category === category),
  }));

  return (
    <div className="min-h-screen bg-white text-luxe-ink">
      {/* Announcement bar */}
      <div className="bg-luxe-ink text-white text-[11px] tracking-[0.2em] uppercase text-center py-2 px-4">
        Complimentary shipping &amp; returns worldwide · Book a personal styling appointment
      </div>

      {/* Header */}
      <header className="border-b border-luxe-mist bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsOpen(true)}
              className="text-[11px] uppercase tracking-[0.18em] text-luxe-taupe hover:text-luxe-ink transition-colors"
            >
              Ask the Stylist
            </button>
            <a href="/" className="font-serif text-2xl sm:text-3xl tracking-[0.35em] text-luxe-ink">
              MAISON&nbsp;LUXE
            </a>
            <div className="flex items-center gap-5 text-luxe-ink">
              <span className="hidden sm:inline text-[11px] uppercase tracking-[0.18em] text-luxe-taupe">Search</span>
              <div className="relative">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.4} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
                {cart.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-luxe-gold text-white text-[9px] font-semibold rounded-full flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* Category nav */}
          <nav className="mt-4 flex items-center justify-center gap-6 sm:gap-9 flex-wrap">
            {categoryOrder.map((c) => (
              <a
                key={c}
                href={`#${c}`}
                className="text-[12px] uppercase tracking-[0.2em] text-luxe-ink hover:text-luxe-gold transition-colors"
              >
                {c === "accessories" ? "Jewellery" : c === "outerwear" ? "Outerwear" : c.charAt(0).toUpperCase() + c.slice(1)}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="bg-luxe-ivory flex items-center justify-center px-8 py-16 lg:py-0 order-2 lg:order-1">
            <div className="max-w-md text-center lg:text-left">
              <p className="text-[11px] uppercase tracking-[0.3em] text-luxe-gold mb-4">The Autumn Collection</p>
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] text-luxe-ink">
                Quiet luxury, considered by hand.
              </h1>
              <p className="mt-6 text-[15px] leading-relaxed text-luxe-taupe">
                Ready-to-wear, outerwear and accessories from the Maison Luxe atelier — and a personal stylist to help you find exactly the right piece.
              </p>
              <div className="mt-8 flex items-center justify-center lg:justify-start gap-4">
                <a href="#women" className="inline-block bg-luxe-ink text-white text-[11px] uppercase tracking-[0.22em] px-8 py-3.5 hover:bg-luxe-gold transition-colors">
                  Shop the Collection
                </a>
                <button onClick={() => setIsOpen(true)} className="text-[11px] uppercase tracking-[0.22em] text-luxe-ink border-b border-luxe-ink pb-1 hover:text-luxe-gold hover:border-luxe-gold transition-colors">
                  Ask the Stylist
                </button>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2 h-[52vh] lg:h-[80vh] overflow-hidden">
            <img src="/images/f06.jpg" alt="Maison Luxe Autumn Collection" className="w-full h-full object-cover object-top" />
          </div>
        </div>
      </section>

      {/* Category tiles */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categoryTiles.map((t) => (
            <a key={t.category} href={`#${t.category}`} className="group block text-center">
              <div className="aspect-[3/4] overflow-hidden bg-luxe-mist">
                <img src={t.image} alt={t.label} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
              <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-luxe-ink group-hover:text-luxe-gold transition-colors">{t.label}</p>
            </a>
          ))}
        </div>
      </section>

      {/* Products by category */}
      <div className="max-w-7xl mx-auto px-6 pb-8 space-y-20">
        {productsByCategory.map(({ category, title, items }) =>
          items.length > 0 ? (
            <section key={category} id={category} className="scroll-mt-28">
              <div className="text-center mb-10">
                <h2 className="font-serif text-3xl text-luxe-ink">{title}</h2>
                <div className="mt-3 w-12 h-px bg-luxe-gold mx-auto" />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
                {items.map((product) => (
                  <div key={product.id} onMouseEnter={() => setLastViewed(product.name)}>
                    <ProductCard
                      product={toProductCard(product)}
                      onAddToCart={addToCart}
                      inCart={cart.includes(product.name)}
                    />
                  </div>
                ))}
              </div>
            </section>
          ) : null
        )}
      </div>

      {/* Stylist band */}
      <section className="bg-luxe-ivory mt-20">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <p className="text-[11px] uppercase tracking-[0.3em] text-luxe-gold mb-4">Personal Styling</p>
          <h2 className="font-serif text-3xl sm:text-4xl text-luxe-ink leading-tight">
            Not sure where to begin? Let our stylist dress you.
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-luxe-taupe max-w-xl mx-auto">
            Tell us the occasion, your size and your taste — our AI personal stylist will curate a complete look, from dress to shoes to the finishing jewellery.
          </p>
          <button
            onClick={() => setIsOpen(true)}
            className="mt-8 inline-block bg-luxe-ink text-white text-[11px] uppercase tracking-[0.22em] px-9 py-4 hover:bg-luxe-gold transition-colors"
          >
            Start Styling
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-luxe-ink text-white/80 py-14 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="font-serif text-2xl tracking-[0.35em] text-white">MAISON&nbsp;LUXE</p>
          <div className="mt-6 flex items-center justify-center gap-8 text-[11px] uppercase tracking-[0.2em] text-white/60">
            <span>Client Care</span>
            <span>Shipping &amp; Returns</span>
            <span>The Atelier</span>
            <span>Book an Appointment</span>
          </div>
          <p className="mt-8 text-[11px] tracking-[0.15em] text-white/40">
            © Maison Luxe — Demo storefront. Tap the chat button to style a look with our AI stylist.
          </p>
        </div>
      </footer>
    </div>
  );
}
