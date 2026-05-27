import { EmptyState } from "@/components/shared/empty-state";
import { PageShell } from "@/components/shared/page-shell";

export default function ProductsPage() {
  return (
    <PageShell title="Produk" description="Kelola katalog produk, SKU, barcode, harga, dan stok.">
      <EmptyState
        title="Produk belum tersedia"
        description="CRUD produk, kategori, upload foto, search, filter, dan pagination akan dibangun pada milestone produk."
        actionLabel="Tambah Produk"
      />
    </PageShell>
  );
}
