import { redirect } from 'next/navigation';
import {
  PaymentMethod,
  PaymentStatus,
  type Prisma,
  TransactionStatus,
} from '@/generated/prisma/client';
import { ReportFilters } from '@/app/(dashboard)/reports/_components/report-filters';
import { ReportSummaryCard } from '@/app/(dashboard)/reports/_components/report-summary-card';
import { PageShell } from '@/components/shared/page-shell';
import { hasPermission } from '@/lib/auth/permissions';
import { getCurrentUserWithAccess } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma';

type ReportsPageProps = {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
    cashierId?: string;
    paymentMethod?: string;
    transactionStatus?: string;
  }>;
};

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getDefaultStartDate() {
  const date = new Date();
  date.setDate(date.getDate() - 6);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getEndOfDay(value: string) {
  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function getStartOfDay(value: string) {
  const date = new Date(`${value}T00:00:00.000`);
  return Number.isNaN(date.getTime()) ? getDefaultStartDate() : date;
}

function normalizeEnumValue<T extends Record<string, string>>(
  enumObject: T,
  value?: string,
): T[keyof T] | undefined {
  if (!value) {
    return undefined;
  }

  return Object.values(enumObject).includes(value)
    ? (value as T[keyof T])
    : undefined;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const user = await getCurrentUserWithAccess();
  const filters = await searchParams;

  if (!user) {
    redirect('/auth/login');
  }

  if (!user.storeId) {
    redirect('/auth/register');
  }

  const canReadReports = await hasPermission(user.id, 'report.read');

  if (!canReadReports) {
    redirect('/dashboard');
  }

  const defaultStartDate = getDefaultStartDate();
  const now = new Date();
  const startDateValue = filters.startDate || formatDateInput(defaultStartDate);
  const endDateValue = filters.endDate || formatDateInput(now);
  const startDate = getStartOfDay(startDateValue);
  const endDate = getEndOfDay(endDateValue);
  const paymentMethod = normalizeEnumValue(
    PaymentMethod,
    filters.paymentMethod,
  );
  const transactionStatus = normalizeEnumValue(
    TransactionStatus,
    filters.transactionStatus,
  );
  const reportWhere: Prisma.TransactionWhereInput = {
    storeId: user.storeId,
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
    ...(filters.cashierId ? { cashierId: filters.cashierId } : {}),
    ...(paymentMethod ? { paymentMethod } : {}),
    ...(transactionStatus
      ? { transactionStatus }
      : {
          transactionStatus: TransactionStatus.completed,
          paymentStatus: PaymentStatus.paid,
        }),
  };
  const paymentReportWhere: Prisma.PaymentWhereInput = {
    transaction: {
      storeId: user.storeId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      ...(filters.cashierId ? { cashierId: filters.cashierId } : {}),
    },
    ...(paymentMethod ? { method: paymentMethod } : {}),
  };

  const [
    cashiers,
    summary,
    transactions,
    topProducts,
    leastSoldProducts,
    productPerformance,
    cashierPerformance,
    paymentBreakdown,
    paymentStatusBreakdown,
    manualTransferPendingSummary,
    shiftSummary,
  ] = await Promise.all([
      prisma.user.findMany({
        where: {
          storeId: user.storeId,
        },
        orderBy: {
          name: 'asc',
        },
        select: {
          id: true,
          name: true,
        },
      }),
      prisma.transaction.aggregate({
        where: reportWhere,
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
      prisma.transaction.findMany({
        where: reportWhere,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          cashier: {
            select: {
              name: true,
            },
          },
        },
        take: 10,
      }),
      prisma.transactionItem.groupBy({
        by: ['productName'],
        where: {
          transaction: reportWhere,
        },
        _sum: {
          qty: true,
          subtotal: true,
        },
        orderBy: {
          _sum: {
            qty: 'desc',
          },
        },
        take: 5,
      }),
      prisma.transactionItem.groupBy({
        by: ['productName'],
        where: {
          transaction: reportWhere,
        },
        _sum: {
          qty: true,
          subtotal: true,
        },
        orderBy: {
          _sum: {
            qty: 'asc',
          },
        },
        take: 5,
      }),
      prisma.transactionItem.groupBy({
        by: ['productName'],
        where: {
          transaction: reportWhere,
        },
        _sum: {
          qty: true,
          subtotal: true,
        },
        orderBy: {
          _sum: {
            subtotal: 'desc',
          },
        },
        take: 10,
      }),
      prisma.transaction.groupBy({
        by: ['cashierId'],
        where: reportWhere,
        _sum: {
          total: true,
        },
        _count: {
          id: true,
        },
        orderBy: {
          _sum: {
            total: 'desc',
          },
        },
      }),
      prisma.transaction.groupBy({
        by: ['paymentMethod'],
        where: reportWhere,
        _sum: {
          total: true,
        },
        _count: {
          id: true,
        },
        orderBy: {
          _sum: {
            total: 'desc',
          },
        },
      }),
      prisma.payment.groupBy({
        by: ['status'],
        where: paymentReportWhere,
        _sum: {
          amount: true,
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
      }),
      prisma.payment.aggregate({
        where: {
          ...paymentReportWhere,
          method: PaymentMethod.manual_transfer,
          status: PaymentStatus.pending,
        },
        _sum: {
          amount: true,
        },
        _count: {
          id: true,
        },
      }),
      prisma.shift.aggregate({
        where: {
          storeId: user.storeId,
          openedAt: {
            gte: startDate,
            lte: endDate,
          },
          ...(filters.cashierId ? { cashierId: filters.cashierId } : {}),
        },
        _count: {
          id: true,
        },
        _sum: {
          expectedCash: true,
          cashDifference: true,
        },
      }),
    ]);

  const totalSales = Number(summary._sum.total?.toString() ?? 0);
  const averageSale = Number(summary._avg.total?.toString() ?? 0);
  const cashierNameById = new Map(cashiers.map((cashier) => [cashier.id, cashier.name]));
  const totalProductQty = productPerformance.reduce(
    (total, product) => total + (product._sum.qty ?? 0),
    0,
  );
  const totalProductRevenue = productPerformance.reduce(
    (total, product) => total + Number(product._sum.subtotal?.toString() ?? 0),
    0,
  );
  const manualTransferPendingTotal = Number(
    manualTransferPendingSummary._sum.amount?.toString() ?? 0,
  );

  return (
    <PageShell
      title="Laporan"
      description="Analisis penjualan, produk, kasir, shift, dan metode pembayaran."
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Laporan' },
      ]}
    >
      <div className="space-y-6">
        <ReportFilters
          cashiers={cashiers}
          cashierId={filters.cashierId}
          endDate={endDateValue}
          paymentMethod={paymentMethod}
          startDate={startDateValue}
          transactionStatus={transactionStatus}
        />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ReportSummaryCard
            label="Total Penjualan"
            value={currencyFormatter.format(totalSales)}
            helper="Sesuai filter aktif"
          />
          <ReportSummaryCard
            label="Jumlah Transaksi"
            value={String(summary._count.id)}
            helper="Invoice dalam periode"
          />
          <ReportSummaryCard
            label="Rata-rata Transaksi"
            value={currencyFormatter.format(averageSale)}
            helper="Total / jumlah transaksi"
          />
          <ReportSummaryCard
            label="Periode"
            value={`${startDateValue} - ${endDateValue}`}
            helper="Tanggal transaksi dibuat"
          />
          <ReportSummaryCard
            label="Transfer Pending"
            value={currencyFormatter.format(manualTransferPendingTotal)}
            helper={`${manualTransferPendingSummary._count.id} pembayaran pending`}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-lg border bg-white p-4">
            <h2 className="text-lg font-semibold">Produk Terlaris</h2>
            <div className="mt-4 space-y-3">
              {topProducts.length > 0 ? (
                topProducts.map((product) => (
                  <div
                    key={product.productName}
                    className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {product.productName}
                      </p>
                      <p className="text-xs text-(--muted-foreground)">
                        Qty {product._sum.qty ?? 0}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">
                      {currencyFormatter.format(
                        Number(product._sum.subtotal?.toString() ?? 0),
                      )}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-(--muted-foreground)">
                  Belum ada data produk.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4">
            <h2 className="text-lg font-semibold">Produk Paling Sedikit Terjual</h2>
            <div className="mt-4 space-y-3">
              {leastSoldProducts.length > 0 ? (
                leastSoldProducts.map((product) => (
                  <div
                    key={product.productName}
                    className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {product.productName}
                      </p>
                      <p className="text-xs text-(--muted-foreground)">
                        Qty {product._sum.qty ?? 0}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">
                      {currencyFormatter.format(
                        Number(product._sum.subtotal?.toString() ?? 0),
                      )}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-(--muted-foreground)">
                  Belum ada data produk.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ReportSummaryCard
            label="Qty Produk Terjual"
            value={String(totalProductQty)}
            helper="Akumulasi item pada filter aktif"
          />
          <ReportSummaryCard
            label="Omzet Produk"
            value={currencyFormatter.format(totalProductRevenue)}
            helper="Subtotal item produk"
          />
          <ReportSummaryCard
            label="Shift Periode"
            value={String(shiftSummary._count.id)}
            helper="Shift dibuka pada periode"
          />
          <ReportSummaryCard
            label="Selisih Kas Shift"
            value={currencyFormatter.format(
              Number(shiftSummary._sum.cashDifference?.toString() ?? 0),
            )}
            helper="Total selisih kas closed shift"
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-lg border bg-white p-4">
            <h2 className="text-lg font-semibold">Ringkasan Produk</h2>
            <div className="mt-4 space-y-3">
              {productPerformance.length > 0 ? (
                productPerformance.map((product) => (
                  <div
                    key={product.productName}
                    className="grid gap-2 rounded-md border px-3 py-2 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                  >
                    <p className="truncate text-sm font-medium">
                      {product.productName}
                    </p>
                    <p className="text-sm text-(--muted-foreground)">
                      Qty {product._sum.qty ?? 0}
                    </p>
                    <p className="text-sm font-semibold">
                      {currencyFormatter.format(
                        Number(product._sum.subtotal?.toString() ?? 0),
                      )}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-(--muted-foreground)">
                  Belum ada ringkasan produk.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4">
            <h2 className="text-lg font-semibold">Performa Kasir</h2>
            <div className="mt-4 space-y-3">
              {cashierPerformance.length > 0 ? (
                cashierPerformance.map((cashier) => (
                  <div
                    key={cashier.cashierId}
                    className="grid gap-2 rounded-md border px-3 py-2 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                  >
                    <p className="truncate text-sm font-medium">
                      {cashierNameById.get(cashier.cashierId) ?? 'Kasir'}
                    </p>
                    <p className="text-sm text-(--muted-foreground)">
                      {cashier._count.id} transaksi
                    </p>
                    <p className="text-sm font-semibold">
                      {currencyFormatter.format(
                        Number(cashier._sum.total?.toString() ?? 0),
                      )}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-(--muted-foreground)">
                  Belum ada performa kasir.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-lg border bg-white p-4">
            <h2 className="text-lg font-semibold">Metode Pembayaran</h2>
            <div className="mt-4 space-y-3">
              {paymentBreakdown.length > 0 ? (
                paymentBreakdown.map((payment) => (
                  <div
                    key={payment.paymentMethod}
                    className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {payment.paymentMethod}
                      </p>
                      <p className="text-xs text-(--muted-foreground)">
                        {payment._count.id} transaksi
                      </p>
                    </div>
                    <p className="text-sm font-semibold">
                      {currencyFormatter.format(
                        Number(payment._sum.total?.toString() ?? 0),
                      )}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-(--muted-foreground)">
                  Belum ada data metode pembayaran.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4">
            <h2 className="text-lg font-semibold">Status Pembayaran</h2>
            <div className="mt-4 space-y-3">
              {paymentStatusBreakdown.length > 0 ? (
                paymentStatusBreakdown.map((payment) => (
                  <div
                    key={payment.status}
                    className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{payment.status}</p>
                      <p className="text-xs text-(--muted-foreground)">
                        {payment._count.id} pembayaran
                      </p>
                    </div>
                    <p className="text-sm font-semibold">
                      {currencyFormatter.format(
                        Number(payment._sum.amount?.toString() ?? 0),
                      )}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-(--muted-foreground)">
                  Belum ada data status pembayaran.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-lg border bg-white p-4">
            <h2 className="text-lg font-semibold">Ringkasan Shift</h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                <p className="text-sm text-(--muted-foreground)">Expected cash</p>
                <p className="text-sm font-semibold">
                  {currencyFormatter.format(
                    Number(shiftSummary._sum.expectedCash?.toString() ?? 0),
                  )}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                <p className="text-sm text-(--muted-foreground)">Selisih kas</p>
                <p className="text-sm font-semibold">
                  {currencyFormatter.format(
                    Number(shiftSummary._sum.cashDifference?.toString() ?? 0),
                  )}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                <p className="text-sm text-(--muted-foreground)">Jumlah shift</p>
                <p className="text-sm font-semibold">{shiftSummary._count.id}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border bg-white">
          <div className="hidden grid-cols-[1fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-3 border-b bg-(--muted) px-4 py-3 text-sm font-medium text-(--muted-foreground) xl:grid">
            <span>Invoice</span>
            <span>Kasir</span>
            <span>Metode</span>
            <span>Total</span>
            <span>Tanggal</span>
          </div>
          <div className="divide-y">
            {transactions.length > 0 ? (
              transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="grid gap-3 px-4 py-4 xl:grid-cols-[1fr_0.8fr_0.8fr_0.8fr_0.8fr] xl:items-center"
                >
                  <p className="text-sm font-medium">
                    {transaction.invoiceNumber}
                  </p>
                  <p className="text-sm">{transaction.cashier.name}</p>
                  <p className="text-sm">{transaction.paymentMethod}</p>
                  <p className="text-sm font-semibold">
                    {currencyFormatter.format(
                      Number(transaction.total.toString()),
                    )}
                  </p>
                  <p className="text-sm">
                    {new Intl.DateTimeFormat('id-ID', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(transaction.createdAt)}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-sm text-(--muted-foreground)">
                Tidak ada transaksi pada filter ini.
              </div>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
