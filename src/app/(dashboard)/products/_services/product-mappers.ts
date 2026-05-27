import type { ProductCategoryOption, ProductListItem } from "@/app/(dashboard)/products/_types/product";

type ProductRecord = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  unit: string;
  costPrice: { toString(): string };
  sellingPrice: { toString(): string };
  stock: number;
  minimumStock: number;
  isActive: boolean;
  categoryId: string | null;
  category?: {
    name: string;
  } | null;
};

type CategoryRecord = {
  id: string;
  name: string;
};

export function toProductListItem(product: ProductRecord): ProductListItem {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    unit: product.unit,
    costPrice: product.costPrice.toString(),
    sellingPrice: product.sellingPrice.toString(),
    stock: product.stock,
    minimumStock: product.minimumStock,
    isActive: product.isActive,
    categoryId: product.categoryId,
    categoryName: product.category?.name ?? null,
  };
}

export function toCategoryOption(category: CategoryRecord): ProductCategoryOption {
  return {
    id: category.id,
    name: category.name,
  };
}
