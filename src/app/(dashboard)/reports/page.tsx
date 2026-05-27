import { EmptyState } from "@/components/shared/empty-state";
import { PageShell } from "@/components/shared/page-shell";

export default function ReportsPage() {
  return (
    <PageShell title="Laporan" description="Analisis penjualan, produk, kasir, shift, dan metode pembayaran.">
      <EmptyState
        title="Laporan belum tersedia"
        description="Laporan akan aktif setelah data transaksi dan shift tersedia."
      />
    </PageShell>
  );
}
