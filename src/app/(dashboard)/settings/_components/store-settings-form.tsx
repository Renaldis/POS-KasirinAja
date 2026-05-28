"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateStoreSettingsAction } from "@/app/(dashboard)/settings/_actions/setting-actions";
import type { StoreSettings } from "@/app/(dashboard)/settings/_types/setting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type StoreSettingsFormProps = {
  canUpdate: boolean;
  store: StoreSettings;
};

export function StoreSettingsForm({ canUpdate, store }: StoreSettingsFormProps) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateStoreSettingsAction(formData);

      if (!result.success) {
        toast.error(result.message ?? "Setting toko gagal diperbarui");
        return;
      }

      toast.success(result.message ?? "Setting toko berhasil diperbarui");
    });
  }

  return (
    <form action={handleSubmit} className="space-y-5 rounded-lg border bg-white p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="store-name">Nama Toko</Label>
          <Input
            id="store-name"
            name="name"
            defaultValue={store.name}
            disabled={!canUpdate || isPending}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="store-phone">Nomor Telepon</Label>
          <Input
            id="store-phone"
            name="phone"
            defaultValue={store.phone ?? ""}
            disabled={!canUpdate || isPending}
            placeholder="08xxxxxxxxxx"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="store-address">Alamat Toko</Label>
        <textarea
          id="store-address"
          name="address"
          defaultValue={store.address ?? ""}
          disabled={!canUpdate || isPending}
          rows={4}
          className="w-full rounded-md border bg-white px-3 py-2 text-sm outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Alamat yang akan tampil di struk"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-[160px_1fr] md:items-start">
        <div className="flex h-32 w-32 items-center justify-center rounded-md border bg-[var(--muted)] text-xs font-medium text-[var(--muted-foreground)]">
          {store.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={store.logoUrl}
              alt={store.name}
              className="h-full w-full rounded-md object-cover"
            />
          ) : (
            "LOGO"
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="store-logo">Logo Toko</Label>
          <Input
            id="store-logo"
            name="logo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={!canUpdate || isPending}
          />
          <p className="text-sm text-[var(--muted-foreground)]">
            JPG, PNG, atau WebP. Maksimal 2 MB.
          </p>
        </div>
      </div>

      {!canUpdate ? (
        <p className="text-sm text-[var(--destructive)]">
          Kamu tidak memiliki akses untuk mengubah setting toko.
        </p>
      ) : null}

      <Button type="submit" disabled={!canUpdate || isPending}>
        {isPending ? "Menyimpan..." : "Simpan Setting"}
      </Button>
    </form>
  );
}
