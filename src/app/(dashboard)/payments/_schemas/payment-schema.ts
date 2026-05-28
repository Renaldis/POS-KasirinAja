import { z } from "zod";

export const paymentIdSchema = z.object({
  paymentId: z.string().min(1, "Pembayaran tidak valid"),
});

export const rejectPaymentSchema = paymentIdSchema.extend({
  reason: z.string().trim().min(3, "Alasan reject minimal 3 karakter"),
});

export type PaymentIdInput = z.infer<typeof paymentIdSchema>;
export type RejectPaymentInput = z.infer<typeof rejectPaymentSchema>;
