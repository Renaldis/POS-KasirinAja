import { StockMovementType } from "@/generated/prisma/client";
import { z } from "zod";

export const stockMovementSchema = z.object({
  productId: z.string().min(1, "Produk wajib dipilih"),
  type: z.enum([
    StockMovementType.stock_in,
    StockMovementType.stock_out,
    StockMovementType.adjustment,
  ]),
  qty: z.coerce.number().int().min(1, "Qty minimal 1").optional(),
  stockAfter: z.coerce.number().int().min(0, "Stok akhir tidak boleh negatif").optional(),
  note: z.string().trim().max(160, "Catatan maksimal 160 karakter").optional(),
});

export type StockMovementInput = z.infer<typeof stockMovementSchema>;
