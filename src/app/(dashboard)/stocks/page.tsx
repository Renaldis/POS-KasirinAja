import { EmptyState } from "@/components/shared/empty-state";
import { PageShell } from "@/components/shared/page-shell";

export default function StocksPage() {
  return (
    <PageShell
      title="Stok"
      description="Pantau stok masuk, stok keluar, adjustment, dan riwayat."
      breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Stok" }]}
    >
      <EmptyState
        title="Riwayat stok belum tersedia"
        description="Mutasi stok dan alert stok minimum akan dibangun setelah modul produk siap."
      />
    </PageShell>
  );
}
