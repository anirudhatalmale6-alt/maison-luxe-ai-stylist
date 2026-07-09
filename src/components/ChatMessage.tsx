"use client";

import { useStore } from "@/context/StoreContext";
import { ChatMessage as ChatMessageType } from "@/types";
import { ProductCard } from "./ProductCard";

function parseMarkdown(text: string): string {
  let result = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  result = result.replace(/\n/g, "<br/>");
  return result;
}

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const { addToCart, cart } = useStore();
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center animate-fade-in">
        <div className="bg-gray-100 text-gray-500 text-xs px-3 py-1.5 rounded-full">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} animate-slide-up`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-brand-red flex items-center justify-center mr-2 flex-shrink-0 mt-1">
          <span className="text-white text-xs font-bold">AI</span>
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "bg-brand-dark text-white rounded-br-md px-4 py-3"
            : "bg-gray-100 text-gray-800 rounded-bl-md"
        }`}
      >
        <div
          className={isUser ? "" : "px-4 py-3"}
          dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content) }}
        />
        {!isUser && message.products && message.products.length > 0 && (
          <div className="px-4 pb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Recommended for you
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {message.products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={addToCart}
                  inCart={cart.includes(product.name)}
                  compact
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
