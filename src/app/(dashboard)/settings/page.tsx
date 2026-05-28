import { redirect } from 'next/navigation';
import { permissions } from '@/constants/permissions';
import { NotificationPreferencesForm } from '@/app/(dashboard)/settings/_components/notification-preferences-form';
import { StoreSettingsForm } from '@/app/(dashboard)/settings/_components/store-settings-form';
import type {
  NotificationPreferenceFormItem,
  StoreSettings,
} from '@/app/(dashboard)/settings/_types/setting';
import { PageShell } from '@/components/shared/page-shell';
import { hasPermission } from '@/lib/auth/permissions';
import { getCurrentUserWithAccess } from '@/lib/auth/server';
import {
  getStoreNotificationPreferences,
  notificationPreferenceDefinitions,
} from '@/lib/notifications/preferences';

const permissionLabelByKey = new Map(
  permissions.map((permission) => [permission.key, permission.name]),
);

export default async function SettingsPage() {
  const user = await getCurrentUserWithAccess();

  if (!user) {
    redirect('/auth/login');
  }

  if (!user.store) {
    redirect('/auth/register');
  }

  const [canUpdateStore, notificationPreferences] = await Promise.all([
    hasPermission(user.id, 'setting.store.update'),
    getStoreNotificationPreferences(user.store.id),
  ]);
  const store: StoreSettings = {
    id: user.store.id,
    name: user.store.name,
    address: user.store.address,
    phone: user.store.phone,
    logoUrl: user.store.logoUrl,
  };
  const preferenceItems: NotificationPreferenceFormItem[] =
    notificationPreferenceDefinitions.map((definition) => ({
      key: definition.key,
      label: definition.label,
      description: definition.description,
      enabled: notificationPreferences[definition.key].enabled,
      permissionOptions: definition.allowedPermissionKeys.map((permissionKey) => ({
        key: permissionKey,
        label: permissionLabelByKey.get(permissionKey) ?? permissionKey,
        checked: notificationPreferences[definition.key].permissionKeys.includes(permissionKey),
      })),
    }));

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
        <NotificationPreferencesForm
          canUpdate={canUpdateStore}
          preferences={preferenceItems}
        />
      </div>
    </PageShell>
  );
}
