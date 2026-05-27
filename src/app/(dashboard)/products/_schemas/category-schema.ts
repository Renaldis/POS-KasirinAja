import { z } from "zod";

export const categoryNameSchema = z
  .string()
  .trim()
  .min(2, "Nama kategori minimal 2 karakter")
  .max(80, "Nama kategori maksimal 80 karakter");

export const createCategorySchema = z.object({
  name: categoryNameSchema,
});

export const updateCategorySchema = z.object({
  id: z.string().min(1, "Kategori tidak valid"),
  name: categoryNameSchema,
});

export const deleteCategorySchema = z.object({
  id: z.string().min(1, "Kategori tidak valid"),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type DeleteCategoryInput = z.infer<typeof deleteCategorySchema>;
