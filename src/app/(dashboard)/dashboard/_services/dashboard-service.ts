import { PaymentStatus, TransactionStatus } from "@/generated/prisma/client";
import type {
  DashboardChartBucket,
  DashboardMetric,
  DashboardPendingTransfer,
  DashboardTopProduct,
  PeriodOption,
} from "@/app/(dashboard)/dashboard/_types/dashboard";
import { prisma } from "@/lib/prisma";

type DashboardFilters = {
  endDate?: string;
  period?: string;
  startDate?: string;
};

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getStartOfDay(value: string) {
  const date = new Date(`${value}T00:00:00.000`);

  if (!Number.isNaN(date.getTime())) {
    return date;
  }

  const fallback = new Date();
  fallback.setHours(0, 0, 0, 0);
  return fallback;
}

function getEndOfDay(value: string) {
  const date = new Date(`${value}T23:59:59.999`);

  if (!Number.isNaN(date.getTime())) {
    return date;
  }

  const fallback = new Date();
  fallback.setHours(23, 59, 59, 999);
  return fallback;
}

export function normalizePeriod(value?: string): PeriodOption {
  return value === "7d" || value === "30d" || value === "custom" ? value : "today";
}

function resolveDateRange({
  endDate,
  period,
  startDate,
}: {
  endDate?: string;
  period: PeriodOption;
  startDate?: string;
}) {
  const todayValue = formatDateInput(new Date());
  const endDateValue = endDate || todayValue;
  const end = getEndOfDay(endDateValue);

  if (period === "custom") {
    const startDateValue = startDate || endDateValue;

    return {
      end,
      endDateValue,
      start: getStartOfDay(startDateValue),
      startDateValue,
    };
  }

  const start = getStartOfDay(endDateValue);

  if (period === "7d") {
    start.setDate(start.getDate() - 6);
  }

  if (period === "30d") {
    start.setDate(start.getDate() - 29);
  }

  return {
    end,
    endDateValue,
    start,
    startDateValue: formatDateInput(start),
  };
}

function buildDailyBuckets(start: Date, end: Date): DashboardChartBucket[] {
  const buckets: DashboardChartBucket[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= end && buckets.length < 31) {
    buckets.push({
      date: new Date(cursor),
      key: formatDateInput(cursor),
      total: 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return buckets;
}

export async function getDashboardData(storeId: string, filters: DashboardFilters) {
  const period = normalizePeriod(filters.period);
  const { end, endDateValue, start, startDateValue } = resolveDateRange({
    endDate: filters.endDate,
    period,
    startDate: filters.startDate,
  });
  const transactionWhere = {
    storeId,
    transactionStatus: TransactionStatus.completed,
    paymentStatus: PaymentStatus.paid,
    createdAt: {
      gte: start,
      lte: end,
    },
  };

  const [
    salesSummary,
    pendingTransfers,
    pendingTransferCount,
    lowStockProducts,
    topProductRows,
    chartTransactions,
  ] = await Promise.all([
    prisma.transaction.aggregate({
      where: transactionWhere,
      _sum: {
        total: true,
      },
      _avg: {
        total: true,
      },
      _count: {
        id: true,
      },
    }),
    prisma.payment.findMany({
      where: {
        method: "manual_transfer",
        status: PaymentStatus.pending,
        transaction: {
          storeId,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        transaction: {
          select: {
            invoiceNumber: true,
            cashier: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      take: 5,
    }),
    prisma.payment.count({
      where: {
        method: "manual_transfer",
        status: PaymentStatus.pending,
        transaction: {
          storeId,
        },
      },
    }),
    prisma.product.findMany({
      where: {
        storeId,
        isActive: true,
        stock: {
          lte: prisma.product.fields.minimumStock,
        },
      },
      orderBy: [{ stock: "asc" }, { name: "asc" }],
      select: {
        id: true,
        minimumStock: true,
        name: true,
        sku: true,
        stock: true,
        unit: true,
      },
      take: 5,
    }),
    prisma.transactionItem.groupBy({
      by: ["productName"],
      where: {
        transaction: transactionWhere,
      },
      _sum: {
        qty: true,
        subtotal: true,
      },
      orderBy: {
        _sum: {
          qty: "desc",
        },
      },
      take: 5,
    }),
    prisma.transaction.findMany({
      where: transactionWhere,
      orderBy: {
        createdAt: "asc",
      },
      select: {
        createdAt: true,
        total: true,
      },
    }),
  ]);

  const totalSales = Number(salesSummary._sum.total?.toString() ?? 0);
  const averageSale = Number(salesSummary._avg.total?.toString() ?? 0);
  const chartBuckets = buildDailyBuckets(start, end);
  const chartBucketByKey = new Map(chartBuckets.map((bucket) => [bucket.key, bucket]));

  for (const transaction of chartTransactions) {
    const bucket = chartBucketByKey.get(formatDateInput(transaction.createdAt));

    if (bucket) {
      bucket.total += Number(transaction.total.toString());
    }
  }

  const metrics: DashboardMetric[] = [
    {
      label: "Penjualan Periode",
      value: currencyFormatter.format(totalSales),
      helper: "Transaksi paid/completed",
    },
    {
      label: "Jumlah Transaksi",
      value: String(salesSummary._count.id),
      helper: `Rata-rata ${currencyFormatter.format(averageSale)}`,
    },
    {
      label: "Pending Transfer",
      value: String(pendingTransferCount),
      helper: "Menunggu verifikasi admin",
    },
    {
      label: "Stok Menipis",
      value: String(lowStockProducts.length),
      helper: lowStockProducts.length > 0 ? "Perlu restock" : "Semua stok aman",
    },
  ];
  const topProducts: DashboardTopProduct[] = topProductRows.map((product) => ({
    productName: product.productName,
    qty: product._sum.qty ?? 0,
    subtotal: Number(product._sum.subtotal?.toString() ?? 0),
  }));
  const pendingTransferItems: DashboardPendingTransfer[] = pendingTransfers.map(
    (payment) => ({
      id: payment.id,
      amount: Number(payment.amount.toString()),
      cashierName: payment.transaction.cashier.name,
      invoiceNumber: payment.transaction.invoiceNumber,
    }),
  );

  return {
    chartBuckets,
    dateRange: {
      end,
      endDateValue,
      start,
      startDateValue,
    },
    lowStockProducts,
    maxChartTotal: Math.max(...chartBuckets.map((bucket) => bucket.total), 1),
    metrics,
    pendingTransferItems,
    period,
    topProducts,
  };
}
