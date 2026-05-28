import type { StockMovementType } from "@/generated/prisma/client";

export type StockProductItem = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  unit: string;
  stock: number;
  minimumStock: number;
  isActive: boolean;
};

export type StockMovementListItem = {
  id: string;
  productName: string;
  userName: string;
  type: StockMovementType;
  qty: number;
  stockBefore: number;
  stockAfter: number;
  note: string | null;
  createdAt: string;
};

export type StockProductOption = {
  id: string;
  name: string;
  sku: string;
  stock: number;
  unit: string;
};

export type StockActionState = {
  success: boolean;
  message?: string;
};
