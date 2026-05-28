import Link from "next/link";
import type { DashboardPendingTransfer } from "@/app/(dashboard)/dashboard/_types/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type PendingTransfersPanelProps = {
  payments: DashboardPendingTransfer[];
};

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function PendingTransfersPanel({ payments }: PendingTransfersPanelProps) {
  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Pending Transfer</h2>
        <Button asChild size="sm" variant="outline">
          <Link href="/payments?status=pending">Lihat Semua</Link>
        </Button>
      </div>
      <div className="mt-5 space-y-3">
        {payments.length > 0 ? (
          payments.map((payment) => (
            <Link
              key={payment.id}
              href={`/payments/${payment.id}`}
              className="block rounded-md border bg-white px-3 py-2 transition-colors hover:border-(--ring)"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{payment.invoiceNumber}</p>
                  <p className="text-xs text-(--muted-foreground)">
                    {payment.cashierName}
                  </p>
                </div>
                <Badge variant="secondary">
                  {currencyFormatter.format(payment.amount)}
                </Badge>
              </div>
            </Link>
          ))
        ) : (
          <p className="text-sm text-(--muted-foreground)">
            Tidak ada transfer manual pending.
          </p>
        )}
      </div>
    </div>
  );
}
