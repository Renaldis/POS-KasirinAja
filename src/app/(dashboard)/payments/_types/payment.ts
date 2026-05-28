import type { PaymentMethod, PaymentStatus, TransactionStatus } from "@/generated/prisma/client";

export type PaymentListItem = {
  id: string;
  invoiceNumber: string;
  cashierName: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionStatus: TransactionStatus;
  amount: string;
  proofUrl: string | null;
  createdAt: string;
};

export type PaymentActionState = {
  success: boolean;
  message?: string;
};
