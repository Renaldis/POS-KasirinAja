export type ProductCategoryOption = {
  id: string;
  name: string;
};

export type ProductListItem = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  unit: string;
  costPrice: string;
  sellingPrice: string;
  stock: number;
  minimumStock: number;
  isActive: boolean;
  categoryId: string | null;
  categoryName: string | null;
};

export type ProductActionState = {
  success: boolean;
  message?: string;
};
