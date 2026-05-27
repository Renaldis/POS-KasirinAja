import { EmptyState } from "@/components/shared/empty-state";
import { PageShell } from "@/components/shared/page-shell";

export default function UsersPage() {
  return (
    <PageShell
      title="User & Role"
      description="Kelola user toko, role custom, dan permission."
      breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "User & Role" }]}
    >
      <EmptyState
        title="Role management belum aktif"
        description="Permission fleksibel akan dibangun sebagai bagian fondasi authorization."
      />
    </PageShell>
  );
}
