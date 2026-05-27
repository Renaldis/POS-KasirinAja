import { EmptyState } from "@/components/shared/empty-state";
import { PageShell } from "@/components/shared/page-shell";

export default function PaymentsPage() {
  return (
    <PageShell title="Pembayaran" description="Kelola transfer manual pending dan approval pembayaran.">
      <EmptyState
        title="Tidak ada pembayaran pending"
        description="Approval transfer manual akan tersedia pada milestone transfer manual."
      />
    </PageShell>
  );
}
