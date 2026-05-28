"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import type { TransactionListItem } from "@/app/(dashboard)/transactions/_types/transaction";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type TransactionListProps = {
  transactions: TransactionListItem[];
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

export function TransactionList({ transactions }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed bg-white p-6 text-center">
        <div>
          <h2 className="text-base font-semibold">Belum ada transaksi</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Transaksi akan muncul setelah POS kasir digunakan.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="hidden grid-cols-[1fr_0.9fr_0.8fr_0.8fr_0.8fr_0.8fr_auto] gap-3 border-b bg-[var(--muted)] px-4 py-3 text-sm font-medium text-[var(--muted-foreground)] xl:grid">
        <span>Invoice</span>
        <span>Kasir</span>
        <span>Total</span>
        <span>Metode</span>
        <span>Status</span>
        <span>Tanggal</span>
        <span className="sr-only">Aksi</span>
      </div>
      <div className="divide-y">
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="grid gap-3 px-4 py-4 xl:grid-cols-[1fr_0.9fr_0.8fr_0.8fr_0.8fr_0.8fr_auto] xl:items-center"
          >
            <div>
              <p className="text-sm font-medium">{transaction.invoiceNumber}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {transaction.itemCount} item
              </p>
            </div>
            <p className="text-sm">{transaction.cashierName}</p>
            <p className="text-sm font-medium">
              {currencyFormatter.format(Number(transaction.total))}
            </p>
            <Badge variant="outline">{transaction.paymentMethod}</Badge>
            <div className="flex flex-wrap gap-1">
              <Badge
                className={
                  transaction.transactionStatus === "voided"
                    ? "border-transparent bg-[var(--destructive)] text-white"
                    : undefined
                }
              >
                {transaction.transactionStatus}
              </Badge>
              <Badge variant="outline">{transaction.paymentStatus}</Badge>
            </div>
            <p className="text-sm">{dateFormatter.format(new Date(transaction.createdAt))}</p>
            <Button asChild size="icon" variant="ghost" title="Lihat detail transaksi">
              <Link href={`/transactions/${transaction.id}`}>
                <Eye className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Lihat detail transaksi</span>
              </Link>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
