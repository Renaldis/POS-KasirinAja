import Link from "next/link";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ShiftListItem } from "@/app/(dashboard)/shifts/_types/shift";

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

type ShiftHistoryListProps = {
  shifts: ShiftListItem[];
};

export function ShiftHistoryList({ shifts }: ShiftHistoryListProps) {
  if (shifts.length === 0) {
    return (
      <div className="flex min-h-44 items-center justify-center rounded-lg border border-dashed bg-white p-6 text-center">
        <div>
          <h2 className="text-base font-semibold">Belum ada riwayat shift</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Riwayat akan muncul setelah kasir membuka shift.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="hidden grid-cols-[1fr_0.8fr_0.8fr_0.8fr_0.8fr_0.7fr_auto] gap-3 border-b bg-[var(--muted)] px-4 py-3 text-sm font-medium text-[var(--muted-foreground)] xl:grid">
        <span>Kasir</span>
        <span>Dibuka</span>
        <span>Ditutup</span>
        <span>Modal</span>
        <span>Selisih</span>
        <span>Status</span>
        <span className="sr-only">Aksi</span>
      </div>
      <div className="divide-y">
        {shifts.map((shift) => (
          <div
            key={shift.id}
            className="grid gap-3 px-4 py-4 xl:grid-cols-[1fr_0.8fr_0.8fr_0.8fr_0.8fr_0.7fr_auto] xl:items-center"
          >
            <div>
              <p className="text-sm font-medium">{shift.cashierName}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{shift.id}</p>
            </div>
            <p className="text-sm">{dateFormatter.format(new Date(shift.openedAt))}</p>
            <p className="text-sm">
              {shift.closedAt ? dateFormatter.format(new Date(shift.closedAt)) : "-"}
            </p>
            <p className="text-sm">{currencyFormatter.format(Number(shift.openingCash))}</p>
            <p className="text-sm">
              {shift.cashDifference
                ? currencyFormatter.format(Number(shift.cashDifference))
                : "-"}
            </p>
            <Badge variant={shift.status === "open" ? "default" : "outline"}>
              {shift.status === "open" ? "Open" : "Closed"}
            </Badge>
            <Button asChild size="icon" variant="ghost" title="Lihat detail shift">
              <Link href={`/shifts/${shift.id}`}>
                <Eye className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Lihat detail shift</span>
              </Link>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
