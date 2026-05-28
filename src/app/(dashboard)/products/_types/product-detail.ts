export type ProductDetail = {
  id: string;
  barcode: string | null;
  categoryName: string | null;
  costPrice: string;
  createdAt: string;
  imageUrl: string | null;
  isActive: boolean;
  minimumStock: number;
  name: string;
  sellingPrice: string;
  sku: string;
  stock: number;
  unit: string;
  updatedAt: string;
};
