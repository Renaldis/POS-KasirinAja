import type { PaymentMethod, PaymentStatus, TransactionStatus } from "@/generated/prisma/client";

export type TransactionListItem = {
  id: string;
  invoiceNumber: string;
  cashierName: string;
  total: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  transactionStatus: TransactionStatus;
  itemCount: number;
  createdAt: string;
};

export type TransactionActionState = {
  success: boolean;
  message?: string;
};
