'use client';

import Link from 'next/link';
import { Pencil, Power } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { deactivateUserAction } from '@/app/(dashboard)/users/_actions/user-actions';
import type { UserListItem } from '@/app/(dashboard)/users/_types/user';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type UserListProps = {
  users: UserListItem[];
  canManage: boolean;
};

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export function UserList({ users, canManage }: UserListProps) {
  if (users.length === 0) {
    return (
      <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed bg-white p-6 text-center">
        <div>
          <h2 className="text-base font-semibold">Belum ada user</h2>
          <p className="mt-1 text-sm text-(--muted-foreground)">
            Tambahkan kasir atau admin toko agar operasional bisa dibagi per
            role.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="hidden grid-cols-[1.4fr_1fr_0.7fr_0.7fr_120px] gap-3 border-b bg-(--muted) px-4 py-3 text-sm font-medium text-(--muted-foreground) xl:grid">
        <span>User</span>
        <span>Role</span>
        <span>Status</span>
        <span>Dibuat</span>
        <span className="text-right">Aksi</span>
      </div>
      <div className="divide-y">
        {users.map((user) => (
          <UserRow key={user.id} canManage={canManage} user={user} />
        ))}
      </div>
    </div>
  );
}

function UserRow({
  user,
  canManage,
}: {
  user: UserListItem;
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDeactivate() {
    if (!window.confirm(`Nonaktifkan user "${user.name}"?`)) {
      return;
    }

    const formData = new FormData();
    formData.set('id', user.id);

    startTransition(async () => {
      const result = await deactivateUserAction(formData);

      if (!result.success) {
        toast.error(result.message ?? 'User gagal dinonaktifkan');
        return;
      }

      toast.success(result.message ?? 'User berhasil dinonaktifkan');
    });
  }

  return (
    <div className="grid gap-3 px-4 py-4 xl:grid-cols-[1.4fr_1fr_0.7fr_0.7fr_120px] xl:items-center">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-medium">{user.name}</p>
          {user.isCurrentUser ? <Badge variant="outline">Kamu</Badge> : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-(--muted-foreground)">
          {user.email}
        </p>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm">{user.roleName ?? 'Tanpa role'}</p>
        {user.roleDescription ? (
          <p className="mt-0.5 truncate text-xs text-(--muted-foreground)">
            {user.roleDescription}
          </p>
        ) : null}
      </div>
      <Badge variant={user.status === 'active' ? 'default' : 'outline'}>
        {user.status === 'active' ? 'Aktif' : 'Nonaktif'}
      </Badge>
      <p className="text-sm text-(--muted-foreground)">
        {dateFormatter.format(user.createdAt)}
      </p>
      <div className="flex justify-end gap-1">
        {canManage ? (
          <Button
            asChild
            size="icon"
            type="button"
            variant="ghost"
            aria-label="Edit user"
          >
            <Link href={`/users/${user.id}/edit`}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        ) : null}
        {canManage && user.status === 'active' && !user.isCurrentUser ? (
          <Button
            size="icon"
            type="button"
            variant="ghost"
            disabled={isPending}
            aria-label="Nonaktifkan user"
            onClick={handleDeactivate}
          >
            <Power className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
