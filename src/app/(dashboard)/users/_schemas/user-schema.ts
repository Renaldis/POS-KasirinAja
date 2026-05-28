import { UserStatus } from "@/generated/prisma/client";
import { z } from "zod";

export const userFormSchema = z.object({
  name: z.string().trim().min(2, "Nama user minimal 2 karakter").max(120),
  email: z.email("Email tidak valid").trim().toLowerCase(),
  roleId: z.string().trim().min(1, "Role wajib dipilih"),
  status: z.enum(UserStatus),
});

export const createUserSchema = userFormSchema.extend({
  password: z.string().min(8, "Password minimal 8 karakter").max(128),
});

export const updateUserSchema = userFormSchema.extend({
  id: z.string().min(1, "User tidak valid"),
  password: z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined)
    .pipe(z.string().min(8, "Password minimal 8 karakter").max(128).optional()),
});

export const deactivateUserSchema = z.object({
  id: z.string().min(1, "User tidak valid"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
