import { z } from "zod";

export const voidTransactionSchema = z.object({
  transactionId: z.string().min(1, "Transaksi tidak valid"),
  reason: z.string().trim().min(3, "Alasan void minimal 3 karakter"),
});

export type VoidTransactionInput = z.infer<typeof voidTransactionSchema>;
