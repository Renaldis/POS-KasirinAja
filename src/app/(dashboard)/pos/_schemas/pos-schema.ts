import { z } from "zod";

export const checkoutCashSchema = z.object({
  receivedCash: z.coerce.number().min(0, "Uang diterima tidak boleh negatif"),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Produk tidak valid"),
        qty: z.coerce.number().int().min(1, "Qty minimal 1"),
      }),
    )
    .min(1, "Keranjang masih kosong"),
});

export type CheckoutCashInput = z.infer<typeof checkoutCashSchema>;
