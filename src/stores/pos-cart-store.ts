"use client";

import { create } from "zustand";

export type PosCartProduct = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  unit: string;
  sellingPrice: string;
  stock: number;
  imageUrl: string | null;
};

export type PosCartItem = PosCartProduct & {
  qty: number;
};

type PosCartStore = {
  items: PosCartItem[];
  addItem: (product: PosCartProduct) => void;
  decrementItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};

function normalizeQty(qty: number, stock: number) {
  if (!Number.isFinite(qty)) {
    return 1;
  }

  return Math.max(1, Math.min(Math.floor(qty), stock));
}

export const usePosCartStore = create<PosCartStore>((set) => ({
  items: [],
  addItem: (product) =>
    set((state) => {
      const existingItem = state.items.find((item) => item.id === product.id);

      if (existingItem) {
        return {
          items: state.items.map((item) =>
            item.id === product.id
              ? { ...item, qty: normalizeQty(item.qty + 1, item.stock) }
              : item,
          ),
        };
      }

      return {
        items: [...state.items, { ...product, qty: 1 }],
      };
    }),
  decrementItem: (productId) =>
    set((state) => ({
      items: state.items
        .map((item) => (item.id === productId ? { ...item, qty: item.qty - 1 } : item))
        .filter((item) => item.qty > 0),
    })),
  updateQty: (productId, qty) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === productId ? { ...item, qty: normalizeQty(qty, item.stock) } : item,
      ),
    })),
  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== productId),
    })),
  clearCart: () => set({ items: [] }),
}));
