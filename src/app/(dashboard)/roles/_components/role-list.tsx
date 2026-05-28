"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteRoleAction } from "@/app/(dashboard)/roles/_actions/role-actions";
import type { RoleListItem } from "@/app/(dashboard)/roles/_types/role";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type RoleListProps = {
  roles: RoleListItem[];
  canManage: boolean;
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function RoleList({ roles, canManage }: RoleListProps) {
  if (roles.length === 0) {
    return (
      <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed bg-white p-6 text-center">
        <div>
          <h2 className="text-base font-semibold">Belum ada role</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Buat role custom untuk membatasi akses user sesuai tugasnya.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="hidden grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_120px] gap-3 border-b bg-[var(--muted)] px-4 py-3 text-sm font-medium text-[var(--muted-foreground)] xl:grid">
        <span>Role</span>
        <span>Tipe</span>
        <span>User</span>
        <span>Permission</span>
        <span className="text-right">Aksi</span>
      </div>
      <div className="divide-y">
        {roles.map((role) => (
          <RoleRow key={role.id} canManage={canManage} role={role} />
        ))}
      </div>
    </div>
  );
}

function RoleRow({ role, canManage }: { role: RoleListItem; canManage: boolean }) {
  const [isPending, startTransition] = useTransition();
  const canEdit = canManage && !role.isGlobal;
  const canDelete = canEdit && !role.isSystem && role.userCount === 0;

  function handleDelete() {
    if (!window.confirm(`Hapus role "${role.name}"?`)) {
      return;
    }

    const formData = new FormData();
    formData.set("id", role.id);

    startTransition(async () => {
      const result = await deleteRoleAction(formData);

      if (!result.success) {
        toast.error(result.message ?? "Role gagal dihapus");
        return;
      }

      toast.success(result.message ?? "Role berhasil dihapus");
    });
  }

  return (
    <div className="grid gap-3 px-4 py-4 xl:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_120px] xl:items-center">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-medium">{role.name}</p>
          {role.isGlobal ? <Badge variant="outline">Global</Badge> : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">
          {role.description ?? `Dibuat ${dateFormatter.format(role.createdAt)}`}
        </p>
      </div>
      <Badge variant={role.isSystem ? "secondary" : "default"}>
        {role.isSystem ? "System" : "Custom"}
      </Badge>
      <p className="text-sm text-[var(--muted-foreground)]">{role.userCount} user</p>
      <p className="text-sm text-[var(--muted-foreground)]">
        {role.permissionCount} permission
      </p>
      <div className="flex justify-end gap-1">
        {canEdit ? (
          <Button asChild size="icon" type="button" variant="ghost" aria-label="Edit role">
            <Link href={`/roles/${role.id}/edit`}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        ) : null}
        {canEdit && !role.isSystem ? (
          <Button
            size="icon"
            type="button"
            variant="ghost"
            disabled={isPending || !canDelete}
            aria-label="Hapus role"
            title={role.userCount > 0 ? "Role masih digunakan user" : undefined}
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
