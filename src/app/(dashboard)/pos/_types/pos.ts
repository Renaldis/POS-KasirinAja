export type PosProductItem = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  unit: string;
  sellingPrice: string;
  stock: number;
  minimumStock: number;
  imageUrl: string | null;
  categoryName: string | null;
};

export type ActivePosShift = {
  id: string;
  openingCash: string;
  openedAt: string;
};

export type CheckoutCashActionState = {
  success: boolean;
  message?: string;
  invoiceNumber?: string;
  change?: string;
  transactionId?: string;
};

export type CheckoutManualTransferActionState = {
  success: boolean;
  message?: string;
  invoiceNumber?: string;
  transactionId?: string;
  paymentId?: string;
};
