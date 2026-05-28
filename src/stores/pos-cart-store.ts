"use client";

import { create } from "zustand";
import { persist } from 'zustand/middleware';

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

export type PosHeldTransaction = {
  id: string;
  label: string;
  items: PosCartItem[];
  createdAt: string;
};

type PosCartStore = {
  items: PosCartItem[];
  heldTransactions: PosHeldTransaction[];
  addItem: (product: PosCartProduct) => void;
  decrementItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  holdCart: () => PosHeldTransaction | null;
  resumeHold: (holdId: string) => PosHeldTransaction | null;
  deleteHold: (holdId: string) => void;
};

function normalizeQty(qty: number, stock: number) {
  if (!Number.isFinite(qty)) {
    return 1;
  }

  return Math.max(1, Math.min(Math.floor(qty), stock));
}

function createHoldLabel(holdCount: number) {
  return `Hold #${holdCount + 1}`;
}

export const usePosCartStore = create<PosCartStore>()(
  persist(
    (set, get) => ({
      items: [],
      heldTransactions: [],
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
      holdCart: () => {
        const state = get();

        if (state.items.length === 0) {
          return null;
        }

        const hold: PosHeldTransaction = {
          id: crypto.randomUUID(),
          label: createHoldLabel(state.heldTransactions.length),
          items: state.items,
          createdAt: new Date().toISOString(),
        };

        set({
          items: [],
          heldTransactions: [hold, ...state.heldTransactions],
        });

        return hold;
      },
      resumeHold: (holdId) => {
        const state = get();
        const hold = state.heldTransactions.find((transaction) => transaction.id === holdId);

        if (!hold) {
          return null;
        }

        const currentCartHold =
          state.items.length > 0
            ? {
                id: crypto.randomUUID(),
                label: createHoldLabel(state.heldTransactions.length),
                items: state.items,
                createdAt: new Date().toISOString(),
              }
            : null;

        set({
          items: hold.items,
          heldTransactions: [
            ...(currentCartHold ? [currentCartHold] : []),
            ...state.heldTransactions.filter((transaction) => transaction.id !== holdId),
          ],
        });

        return hold;
      },
      deleteHold: (holdId) =>
        set((state) => ({
          heldTransactions: state.heldTransactions.filter((transaction) => transaction.id !== holdId),
        })),
    }),
    {
      name: "kasirinaja-pos-cart",
    },
  ),
);
