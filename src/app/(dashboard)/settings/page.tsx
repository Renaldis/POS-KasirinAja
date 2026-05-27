import { EmptyState } from "@/components/shared/empty-state";
import { PageShell } from "@/components/shared/page-shell";

export default function SettingsPage() {
  return (
    <PageShell title="Setting" description="Atur profil toko, struk, pajak opsional, dan browser print.">
      <EmptyState
        title="Setting toko belum aktif"
        description="Pengaturan toko akan tersedia setelah fondasi auth dan store siap."
      />
    </PageShell>
  );
}
