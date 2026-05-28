import { z } from "zod";

export const updateStoreSettingsSchema = z.object({
  name: z.string().trim().min(2, "Nama toko minimal 2 karakter"),
  address: z.string().trim().max(240, "Alamat maksimal 240 karakter").optional(),
  phone: z.string().trim().max(32, "Nomor telepon maksimal 32 karakter").optional(),
});

export type UpdateStoreSettingsInput = z.infer<typeof updateStoreSettingsSchema>;
