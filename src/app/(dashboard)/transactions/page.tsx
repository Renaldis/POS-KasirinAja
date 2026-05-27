import { EmptyState } from "@/components/shared/empty-state";
import { PageShell } from "@/components/shared/page-shell";

export default function TransactionsPage() {
  return (
    <PageShell
      title="Transaksi"
      description="Lihat transaksi cash, transfer, void, dan status pembayaran."
      breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Transaksi" }]}
    >
      <EmptyState
        title="Belum ada transaksi"
        description="Transaksi akan muncul setelah POS kasir mulai digunakan."
      />
    </PageShell>
  );
}
