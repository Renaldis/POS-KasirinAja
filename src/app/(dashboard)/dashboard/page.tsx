import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/shared/page-shell";

const metrics = [
  { label: "Penjualan Hari Ini", value: "Rp0", helper: "Belum ada transaksi" },
  { label: "Transaksi", value: "0", helper: "0 pending transfer" },
  { label: "Produk Terlaris", value: "-", helper: "Data akan muncul setelah penjualan" },
  { label: "Stok Menipis", value: "0", helper: "Semua stok aman" },
];

export default function DashboardPage() {
  return (
    <PageShell
      title="Dashboard"
      description="Ringkasan operasional toko hari ini."
      breadcrumbs={[{ label: "Dashboard" }]}
      actions={
        <Button>Mulai POS</Button>
      }
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-lg border bg-[var(--card)] p-4 text-[var(--card-foreground)]"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-[var(--muted-foreground)]">{metric.label}</p>
              <Badge variant="secondary">MVP</Badge>
            </div>
            <p className="mt-3 text-2xl font-semibold">{metric.value}</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{metric.helper}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-lg border bg-[var(--card)] p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Grafik Penjualan</h2>
            <Badge>7 Hari</Badge>
          </div>
          <div className="mt-5 flex h-64 items-center justify-center rounded-md border border-dashed bg-[var(--muted)] text-sm text-[var(--muted-foreground)]">
            Data grafik akan muncul setelah transaksi tersedia.
          </div>
        </div>

        <div className="rounded-lg border bg-[var(--card)] p-5">
          <h2 className="text-base font-semibold">Aktivitas Penting</h2>
          <div className="mt-5 space-y-3 text-sm text-[var(--muted-foreground)]">
            <p>Belum ada pembayaran transfer pending.</p>
            <p>Belum ada shift yang perlu ditutup.</p>
            <p>Belum ada produk yang mencapai stok minimum.</p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
