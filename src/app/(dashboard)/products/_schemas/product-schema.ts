import { z } from "zod";

const optionalIdSchema = z.string().trim().optional().transform((value) => value || undefined);

export const productFormSchema = z.object({
  name: z.string().trim().min(2, "Nama produk minimal 2 karakter").max(120),
  sku: z.string().trim().min(2, "SKU minimal 2 karakter").max(60),
  barcode: z.string().trim().optional().transform((value) => value || undefined),
  categoryId: optionalIdSchema,
  unit: z.string().trim().min(1, "Satuan wajib diisi").max(30),
  costPrice: z.coerce.number().min(0, "Harga modal tidak boleh negatif"),
  sellingPrice: z.coerce.number().min(0, "Harga jual tidak boleh negatif"),
  stock: z.coerce.number().int().min(0, "Stok tidak boleh negatif"),
  minimumStock: z.coerce.number().int().min(0, "Minimum stok tidak boleh negatif"),
  isActive: z.coerce.boolean().default(true),
});

export const createProductSchema = productFormSchema;

export const updateProductSchema = productFormSchema.extend({
  id: z.string().min(1, "Produk tidak valid"),
});

export const deactivateProductSchema = z.object({
  id: z.string().min(1, "Produk tidak valid"),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type DeactivateProductInput = z.infer<typeof deactivateProductSchema>;
