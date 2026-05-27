import { EmptyState } from "@/components/shared/empty-state";
import { PageShell } from "@/components/shared/page-shell";

export default function PosPage() {
  return (
    <PageShell title="POS Kasir" description="Halaman transaksi kasir akan dibangun di sini.">
      <EmptyState
        title="POS belum aktif"
        description="Flow search produk, keranjang, pembayaran cash, hold transaksi, dan browser print akan masuk pada milestone POS."
      />
    </PageShell>
  );
}
