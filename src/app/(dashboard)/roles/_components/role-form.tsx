"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { createRoleAction, updateRoleAction } from "@/app/(dashboard)/roles/_actions/role-actions";
import {
  moduleLabels,
} from "@/app/(dashboard)/roles/_services/permission-groups";
import type {
  PermissionGroup,
  RoleFormValue,
} from "@/app/(dashboard)/roles/_types/role";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RoleFormProps = {
  mode: "create" | "edit";
  permissionGroups: PermissionGroup[];
  role?: RoleFormValue;
};

export function RoleForm({ mode, permissionGroups, role }: RoleFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const selectedPermissions = new Set(role?.permissionIds ?? []);
  const isEdit = mode === "edit";

  function handleSubmit(formData: FormData) {
    if (role?.id) {
      formData.set("id", role.id);
    }

    startTransition(async () => {
      const result = isEdit
        ? await updateRoleAction(formData)
        : await createRoleAction(formData);

      if (!result.success) {
        toast.error(result.message ?? "Role gagal disimpan");
        return;
      }

      toast.success(result.message ?? "Role berhasil disimpan");
      router.push("/roles");
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <section className="rounded-lg border bg-white p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="role-name">Nama Role</Label>
            <Input
              id="role-name"
              name="name"
              defaultValue={role?.name ?? ""}
              placeholder="Kasir Senior"
              required
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role-description">Deskripsi</Label>
            <Input
              id="role-description"
              name="description"
              defaultValue={role?.description ?? ""}
              placeholder="Akses kasir dengan izin tambahan"
              disabled={isPending}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        {permissionGroups.map((group) => (
          <div key={group.module} className="rounded-lg border bg-white p-4">
            <h2 className="text-sm font-semibold">
              {moduleLabels[group.module] ?? group.module}
            </h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {group.permissions.map((permission) => (
                <label
                  key={permission.id}
                  className="flex min-h-20 gap-3 rounded-md border p-3 text-sm"
                >
                  <input
                    name="permissionIds"
                    type="checkbox"
                    value={permission.id}
                    defaultChecked={selectedPermissions.has(permission.id)}
                    disabled={isPending}
                    className="mt-1 h-4 w-4 shrink-0"
                  />
                  <span className="min-w-0">
                    <span className="block font-medium">{permission.name}</span>
                    <span className="mt-1 block break-words text-xs text-[var(--muted-foreground)]">
                      {permission.key}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </section>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" disabled={isPending} onClick={() => router.back()}>
          Batal
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Menyimpan..." : "Simpan Role"}
        </Button>
      </div>
    </form>
  );
}
