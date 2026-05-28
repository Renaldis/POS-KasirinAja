import { z } from "zod";

export const roleFormSchema = z.object({
  name: z.string().trim().min(2, "Nama role minimal 2 karakter").max(80),
  description: z
    .string()
    .trim()
    .max(180, "Deskripsi maksimal 180 karakter")
    .optional()
    .transform((value) => value || undefined),
  permissionIds: z.array(z.string().min(1)).min(1, "Pilih minimal 1 permission"),
});

export const createRoleSchema = roleFormSchema;

export const updateRoleSchema = roleFormSchema.extend({
  id: z.string().min(1, "Role tidak valid"),
});

export const deleteRoleSchema = z.object({
  id: z.string().min(1, "Role tidak valid"),
});
