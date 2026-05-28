export type PeriodOption = "today" | "7d" | "30d" | "custom";

export type DashboardMetric = {
  label: string;
  value: string;
  helper: string;
};

export type DashboardChartBucket = {
  date: Date;
  key: string;
  total: number;
};

export type DashboardTopProduct = {
  productName: string;
  qty: number;
  subtotal: number;
};

export type DashboardPendingTransfer = {
  id: string;
  amount: number;
  cashierName: string;
  invoiceNumber: string;
};

export type DashboardLowStockProduct = {
  id: string;
  minimumStock: number;
  name: string;
  sku: string;
  stock: number;
  unit: string;
};
