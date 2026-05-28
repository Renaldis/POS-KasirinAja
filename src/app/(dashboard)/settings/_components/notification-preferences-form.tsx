"use client";

import { BellRing } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { updateNotificationPreferencesAction } from "@/app/(dashboard)/settings/_actions/setting-actions";
import type { NotificationPreferenceFormItem } from "@/app/(dashboard)/settings/_types/setting";
import { Button } from "@/components/ui/button";

type NotificationPreferencesFormProps = {
  canUpdate: boolean;
  preferences: NotificationPreferenceFormItem[];
};

export function NotificationPreferencesForm({
  canUpdate,
  preferences,
}: NotificationPreferencesFormProps) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateNotificationPreferencesAction(formData);

      if (!result.success) {
        toast.error(result.message ?? "Preferensi notifikasi gagal diperbarui");
        return;
      }

      toast.success(result.message ?? "Preferensi notifikasi berhasil diperbarui");
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4 rounded-lg border bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-(--muted)">
          <BellRing className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Preferensi Notifikasi</h2>
          <p className="mt-1 text-sm text-(--muted-foreground)">
            Atur event notifikasi broadcast dan permission penerimanya.
          </p>
        </div>
      </div>

      <div className="divide-y rounded-lg border">
        {preferences.map((preference) => (
          <div key={preference.key} className="space-y-3 p-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                name={`${preference.key}.enabled`}
                defaultChecked={preference.enabled}
                disabled={!canUpdate || isPending}
                className="mt-1 h-4 w-4 rounded border"
              />
              <span>
                <span className="block text-sm font-medium">{preference.label}</span>
                <span className="mt-1 block text-sm text-(--muted-foreground)">
                  {preference.description}
                </span>
              </span>
            </label>

            <div className="grid gap-2 pl-7 sm:grid-cols-2">
              {preference.permissionOptions.map((permission) => (
                <label key={permission.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name={`${preference.key}.permissionKeys`}
                    value={permission.key}
                    defaultChecked={permission.checked}
                    disabled={!canUpdate || isPending}
                    className="h-4 w-4 rounded border"
                  />
                  <span>{permission.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {!canUpdate ? (
        <p className="text-sm text-(--destructive)">
          Kamu tidak memiliki akses untuk mengubah preferensi notifikasi.
        </p>
      ) : null}

      <Button type="submit" disabled={!canUpdate || isPending}>
        {isPending ? "Menyimpan..." : "Simpan Preferensi"}
      </Button>
    </form>
  );
}
