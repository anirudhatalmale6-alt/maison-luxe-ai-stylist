"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface StoreState {
  cart: string[];
  lastViewed: string | null;
  currentPath: string;
}

interface StoreContextType extends StoreState {
  addToCart: (item: string) => void;
  removeFromCart: (item: string) => void;
  setLastViewed: (item: string) => void;
  setCurrentPath: (path: string) => void;
  clearCart: () => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>({
    cart: [],
    lastViewed: null,
    currentPath: "/",
  });

  const addToCart = useCallback((item: string) => {
    setState((prev) => ({
      ...prev,
      cart: prev.cart.includes(item) ? prev.cart : [...prev.cart, item],
    }));
  }, []);

  const removeFromCart = useCallback((item: string) => {
    setState((prev) => ({
      ...prev,
      cart: prev.cart.filter((i) => i !== item),
    }));
  }, []);

  const setLastViewed = useCallback((item: string) => {
    setState((prev) => ({ ...prev, lastViewed: item }));
  }, []);

  const setCurrentPath = useCallback((path: string) => {
    setState((prev) => ({ ...prev, currentPath: path }));
  }, []);

  const clearCart = useCallback(() => {
    setState((prev) => ({ ...prev, cart: [] }));
  }, []);

  return (
    <StoreContext.Provider
      value={{
        ...state,
        addToCart,
        removeFromCart,
        setLastViewed,
        setCurrentPath,
        clearCart,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
