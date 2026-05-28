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
  return date.toISOString().slice(0, 10);
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

  const [cashiers, summary, transactions, topProducts, paymentBreakdown] =
    await Promise.all([
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
    ]);

  const totalSales = Number(summary._sum.total?.toString() ?? 0);
  const averageSale = Number(summary._avg.total?.toString() ?? 0);

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
