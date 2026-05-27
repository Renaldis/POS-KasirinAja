import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';
import {
  PaymentMethod,
  PaymentStatus,
  TransactionStatus,
} from '@/generated/prisma/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/shared/page-shell';
import { hasPermission } from '@/lib/auth/permissions';
import { getCurrentUserWithAccess } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma';

type ShiftDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatMoney(
  value: { toString(): string } | number | null | undefined,
) {
  if (value === null || value === undefined) {
    return '-';
  }

  return currencyFormatter.format(Number(value.toString()));
}

export default async function ShiftDetailPage({
  params,
}: ShiftDetailPageProps) {
  const user = await getCurrentUserWithAccess();
  const { id } = await params;

  if (!user) {
    redirect('/auth/login');
  }

  if (!user.storeId) {
    redirect('/auth/register');
  }

  const [canReadAllShifts, canReadOwnShifts] = await Promise.all([
    hasPermission(user.id, 'shift.read.all'),
    hasPermission(user.id, 'shift.read.own'),
  ]);

  if (!canReadAllShifts && !canReadOwnShifts) {
    redirect('/dashboard');
  }

  const shift = await prisma.shift.findFirst({
    where: {
      id,
      storeId: user.storeId,
      ...(canReadAllShifts ? {} : { cashierId: user.id }),
    },
    include: {
      cashier: {
        select: {
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          transactions: true,
        },
      },
    },
  });

  if (!shift) {
    notFound();
  }

  const [totalSales, cashPaidSales, manualTransferPending, manualTransferPaid] =
    await Promise.all([
      prisma.transaction.aggregate({
        where: {
          shiftId: shift.id,
          transactionStatus: TransactionStatus.completed,
        },
        _sum: {
          total: true,
        },
      }),
      prisma.transaction.aggregate({
        where: {
          shiftId: shift.id,
          paymentMethod: PaymentMethod.cash,
          paymentStatus: PaymentStatus.paid,
          transactionStatus: TransactionStatus.completed,
        },
        _sum: {
          total: true,
        },
      }),
      prisma.transaction.count({
        where: {
          shiftId: shift.id,
          paymentMethod: PaymentMethod.manual_transfer,
          paymentStatus: PaymentStatus.pending,
        },
      }),
      prisma.transaction.count({
        where: {
          shiftId: shift.id,
          paymentMethod: PaymentMethod.manual_transfer,
          paymentStatus: PaymentStatus.paid,
        },
      }),
    ]);

  const openedAt = dateFormatter.format(shift.openedAt);
  const closedAt = shift.closedAt ? dateFormatter.format(shift.closedAt) : '-';

  return (
    <PageShell
      title="Detail Shift"
      description={`Shift ${shift.cashier.name} dibuka pada ${openedAt}.`}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Shift Kasir', href: '/shifts' },
        { label: 'Detail Shift' },
      ]}
      actions={
        <Button asChild variant="outline">
          <Link href="/shifts">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Kembali
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <section className="rounded-lg border bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{shift.cashier.name}</h2>
                <Badge
                  variant={shift.status === 'open' ? 'default' : 'outline'}
                >
                  {shift.status === 'open' ? 'Open' : 'Closed'}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {shift.cashier.email}
              </p>
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">{shift.id}</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border p-3">
              <p className="text-xs text-[var(--muted-foreground)]">Dibuka</p>
              <p className="mt-1 text-sm font-medium">{openedAt}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-[var(--muted-foreground)]">Ditutup</p>
              <p className="mt-1 text-sm font-medium">{closedAt}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-[var(--muted-foreground)]">
                Modal Awal
              </p>
              <p className="mt-1 text-sm font-medium">
                {formatMoney(shift.openingCash)}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-[var(--muted-foreground)]">
                Uang Fisik Akhir
              </p>
              <p className="mt-1 text-sm font-medium">
                {formatMoney(shift.closingCash)}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              Total Transaksi
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {shift._count.transactions}
            </p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              Penjualan Completed
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatMoney(totalSales._sum.total)}
            </p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-[var(--muted-foreground)]">Cash Paid</p>
            <p className="mt-2 text-2xl font-semibold">
              {formatMoney(cashPaidSales._sum.total)}
            </p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              Transfer Manual
            </p>
            <p className="mt-2 text-sm font-medium">
              {manualTransferPaid} paid / {manualTransferPending} pending
            </p>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              Expected Cash
            </p>
            <p className="mt-2 text-xl font-semibold">
              {formatMoney(shift.expectedCash)}
            </p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              Selisih Kas
            </p>
            <p className="mt-2 text-xl font-semibold">
              {formatMoney(shift.cashDifference)}
            </p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              Status Rekap
            </p>
            <p className="mt-2 text-xl font-semibold">
              {shift.status === 'open' ? 'Masih berjalan' : 'Sudah ditutup'}
            </p>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
