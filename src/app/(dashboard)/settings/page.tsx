import { redirect } from 'next/navigation';
import { StoreSettingsForm } from '@/app/(dashboard)/settings/_components/store-settings-form';
import type { StoreSettings } from '@/app/(dashboard)/settings/_types/setting';
import { PageShell } from '@/components/shared/page-shell';
import { hasPermission } from '@/lib/auth/permissions';
import { getCurrentUserWithAccess } from '@/lib/auth/server';

export default async function SettingsPage() {
  const user = await getCurrentUserWithAccess();

  if (!user) {
    redirect('/auth/login');
  }

  if (!user.store) {
    redirect('/auth/register');
  }

  const canUpdateStore = await hasPermission(user.id, 'setting.store.update');
  const store: StoreSettings = {
    id: user.store.id,
    name: user.store.name,
    address: user.store.address,
    phone: user.store.phone,
    logoUrl: user.store.logoUrl,
  };

  return (
    <PageShell
      title="Setting"
      description="Atur profil toko dan informasi yang tampil di struk."
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Setting' },
      ]}
    >
      <div className="space-y-4">
        <section className="rounded-lg border bg-white p-4">
          <h2 className="text-lg font-semibold">Profil Toko</h2>
          <p className="mt-1 text-sm text-(--muted-foreground)">
            Nama, alamat, telepon, dan logo toko dipakai untuk identitas
            dashboard dan struk.
          </p>
        </section>
        <StoreSettingsForm canUpdate={canUpdateStore} store={store} />
      </div>
    </PageShell>
  );
}
