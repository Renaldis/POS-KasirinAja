import { z } from "zod";

export const registerStoreSchema = z.object({
  storeName: z.string().trim().min(2, "Nama toko minimal 2 karakter"),
});

export type RegisterStoreInput = z.infer<typeof registerStoreSchema>;
