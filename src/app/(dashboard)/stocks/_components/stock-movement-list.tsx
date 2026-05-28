import type { StockMovementListItem } from "@/app/(dashboard)/stocks/_types/stock";
import { Badge } from "@/components/ui/badge";

type StockMovementListProps = {
  movements: StockMovementListItem[];
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function StockMovementList({ movements }: StockMovementListProps) {
  if (movements.length === 0) {
    return (
      <div className="flex min-h-44 items-center justify-center rounded-lg border border-dashed bg-white p-6 text-center">
        <div>
          <h2 className="text-base font-semibold">Belum ada mutasi stok</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Riwayat akan muncul saat stok berubah dari produk, POS, void, atau adjustment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="hidden grid-cols-[1fr_0.7fr_0.7fr_0.7fr_0.8fr_0.8fr] gap-3 border-b bg-[var(--muted)] px-4 py-3 text-sm font-medium text-[var(--muted-foreground)] xl:grid">
        <span>Produk</span>
        <span>Tipe</span>
        <span>Qty</span>
        <span>Stok</span>
        <span>User</span>
        <span>Tanggal</span>
      </div>
      <div className="divide-y">
        {movements.map((movement) => (
          <div
            key={movement.id}
            className="grid gap-3 px-4 py-4 xl:grid-cols-[1fr_0.7fr_0.7fr_0.7fr_0.8fr_0.8fr] xl:items-center"
          >
            <div>
              <p className="text-sm font-medium">{movement.productName}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{movement.note ?? "-"}</p>
            </div>
            <Badge variant="outline">{movement.type}</Badge>
            <p className="text-sm font-medium">{movement.qty}</p>
            <p className="text-sm">
              {movement.stockBefore} ke {movement.stockAfter}
            </p>
            <p className="text-sm">{movement.userName}</p>
            <p className="text-sm">{dateFormatter.format(new Date(movement.createdAt))}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
