import { Badge } from "@/components/ui/badge";
import { CloseShiftForm } from "@/app/(dashboard)/shifts/_components/close-shift-form";
import type { ActiveShift } from "@/app/(dashboard)/shifts/_types/shift";

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

type ActiveShiftCardProps = {
  canClose: boolean;
  shift: ActiveShift;
};

export function ActiveShiftCard({ canClose, shift }: ActiveShiftCardProps) {
  return (
    <section className="rounded-lg border bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Shift Aktif</h2>
            <Badge>Open</Badge>
          </div>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Dibuka oleh {shift.cashierName} pada {dateFormatter.format(new Date(shift.openedAt))}
          </p>
          <p className="mt-3 text-sm">
            Modal awal:{" "}
            <span className="font-semibold">
              {currencyFormatter.format(Number(shift.openingCash))}
            </span>
          </p>
        </div>
      </div>
      {canClose ? (
        <div className="mt-4 border-t pt-4">
          <CloseShiftForm shiftId={shift.id} />
        </div>
      ) : (
        <p className="mt-4 border-t pt-4 text-sm text-[var(--muted-foreground)]">
          Kamu tidak memiliki akses untuk menutup shift.
        </p>
      )}
    </section>
  );
}
