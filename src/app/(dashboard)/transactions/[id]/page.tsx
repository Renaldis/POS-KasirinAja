import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { TransactionStatus } from "@/generated/prisma/client";
import { ReceiptPrintButton } from "@/app/(dashboard)/transactions/_components/receipt-print-button";
import { VoidTransactionForm } from "@/app/(dashboard)/transactions/_components/void-transaction-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/shared/page-shell";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentUserWithAccess } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

type TransactionDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatMoney(value: { toString(): string } | number) {
  return currencyFormatter.format(Number(value.toString()));
}

export default async function TransactionDetailPage({ params }: TransactionDetailPageProps) {
  const user = await getCurrentUserWithAccess();
  const { id } = await params;

  if (!user) {
    redirect("/auth/login");
  }

  if (!user.storeId) {
    redirect("/auth/register");
  }

  const [canReadAllTransactions, canReadOwnTransactions, canVoidTransaction] = await Promise.all([
    hasPermission(user.id, "transaction.read.all"),
    hasPermission(user.id, "transaction.read.own"),
    hasPermission(user.id, "transaction.void"),
  ]);

  if (!canReadAllTransactions && !canReadOwnTransactions) {
    redirect("/dashboard");
  }

  const transaction = await prisma.transaction.findFirst({
    where: {
      id,
      storeId: user.storeId,
      ...(canReadAllTransactions ? {} : { cashierId: user.id }),
    },
    include: {
      cashier: {
        select: {
          name: true,
        },
      },
      items: {
        orderBy: {
          createdAt: "asc",
        },
      },
      payments: {
        orderBy: {
          createdAt: "asc",
        },
      },
      store: {
        select: {
          name: true,
          address: true,
        },
      },
      voidedByUser: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!transaction) {
    notFound();
  }

  const canVoid =
    canVoidTransaction && transaction.transactionStatus !== TransactionStatus.voided;

  return (
    <PageShell
      title="Detail Transaksi"
      description={transaction.invoiceNumber}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Transaksi", href: "/transactions" },
        { label: "Detail Transaksi" },
      ]}
      actions={
        <>
          <ReceiptPrintButton />
          <Button asChild variant="outline">
            <Link href="/transactions">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Kembali
            </Link>
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <section className="rounded-lg border bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">{transaction.invoiceNumber}</h2>
                <Badge
                  className={
                    transaction.transactionStatus === TransactionStatus.voided
                      ? "border-transparent bg-[var(--destructive)] text-white"
                      : undefined
                  }
                >
                  {transaction.transactionStatus}
                </Badge>
                <Badge variant="outline">{transaction.paymentStatus}</Badge>
              </div>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {dateFormatter.format(transaction.createdAt)} oleh {transaction.cashier.name}
              </p>
            </div>
            <p className="text-2xl font-semibold">{formatMoney(transaction.total)}</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border p-3">
              <p className="text-xs text-[var(--muted-foreground)]">Metode</p>
              <p className="mt-1 text-sm font-medium">{transaction.paymentMethod}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-[var(--muted-foreground)]">Subtotal</p>
              <p className="mt-1 text-sm font-medium">{formatMoney(transaction.subtotal)}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-[var(--muted-foreground)]">Diskon</p>
              <p className="mt-1 text-sm font-medium">{formatMoney(transaction.discountTotal)}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-[var(--muted-foreground)]">Pajak</p>
              <p className="mt-1 text-sm font-medium">{formatMoney(transaction.taxTotal)}</p>
            </div>
          </div>

          {transaction.transactionStatus === TransactionStatus.voided ? (
            <div className="mt-4 rounded-md border border-[var(--destructive)]/30 bg-red-50 p-3">
              <p className="text-sm font-medium text-[var(--destructive)]">Transaksi void</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {transaction.voidReason ?? "-"} oleh {transaction.voidedByUser?.name ?? "-"}
                {transaction.voidedAt ? ` pada ${dateFormatter.format(transaction.voidedAt)}` : ""}
              </p>
            </div>
          ) : null}
        </section>

        <section className="overflow-hidden rounded-lg border bg-white">
          <div className="grid grid-cols-[1fr_80px_120px_120px] gap-3 border-b bg-[var(--muted)] px-4 py-3 text-sm font-medium text-[var(--muted-foreground)]">
            <span>Item</span>
            <span>Qty</span>
            <span>Harga</span>
            <span className="text-right">Subtotal</span>
          </div>
          <div className="divide-y">
            {transaction.items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[1fr_80px_120px_120px] gap-3 px-4 py-3 text-sm"
              >
                <span className="font-medium">{item.productName}</span>
                <span>{item.qty}</span>
                <span>{formatMoney(item.unitPrice)}</span>
                <span className="text-right font-medium">{formatMoney(item.subtotal)}</span>
              </div>
            ))}
          </div>
        </section>

        {canVoid ? <VoidTransactionForm transactionId={transaction.id} /> : null}
      </div>

      <div className="print-receipt">
        <div className="mx-auto w-[280px] bg-white p-4 text-sm text-black">
          <h1 className="text-center text-base font-semibold">{transaction.store.name}</h1>
          {transaction.store.address ? (
            <p className="mt-1 text-center text-xs">{transaction.store.address}</p>
          ) : null}
          <p className="mt-1 text-center text-xs">{transaction.invoiceNumber}</p>
          <p className="mt-1 text-center text-xs">{dateFormatter.format(transaction.createdAt)}</p>
          <p className="mt-1 text-center text-xs">Kasir: {transaction.cashier.name}</p>
          <div className="my-3 border-t border-dashed border-black" />
          {transaction.items.map((item) => (
            <div key={`receipt-${item.id}`} className="mb-2">
              <div className="flex justify-between gap-3">
                <span>{item.productName}</span>
                <span>{formatMoney(item.subtotal)}</span>
              </div>
              <p className="text-xs">
                {item.qty} x {formatMoney(item.unitPrice)}
              </p>
            </div>
          ))}
          <div className="my-3 border-t border-dashed border-black" />
          <div className="flex justify-between">
            <span>Total</span>
            <span>{formatMoney(transaction.total)}</span>
          </div>
          <div className="flex justify-between">
            <span>Metode</span>
            <span>{transaction.paymentMethod}</span>
          </div>
          <div className="flex justify-between">
            <span>Status</span>
            <span>{transaction.paymentStatus}</span>
          </div>
          <p className="mt-4 text-center text-xs">Terima kasih</p>
        </div>
      </div>
    </PageShell>
  );
}
