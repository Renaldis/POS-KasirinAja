'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import {
  createUserAction,
  updateUserAction,
} from '@/app/(dashboard)/users/_actions/user-actions';
import type {
  UserFormValue,
  UserRoleOption,
} from '@/app/(dashboard)/users/_types/user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type UserFormProps = {
  mode: 'create' | 'edit';
  roles: UserRoleOption[];
  user?: UserFormValue;
  isCurrentUser?: boolean;
};

export function UserForm({
  mode,
  roles,
  user,
  isCurrentUser = false,
}: UserFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEdit = mode === 'edit';

  function handleSubmit(formData: FormData) {
    if (user?.id) {
      formData.set('id', user.id);
    }

    startTransition(async () => {
      const result = isEdit
        ? await updateUserAction(formData)
        : await createUserAction(formData);

      if (!result.success) {
        toast.error(result.message ?? 'User gagal disimpan');
        return;
      }

      toast.success(result.message ?? 'User berhasil disimpan');
      router.push('/users');
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="rounded-lg border bg-white p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nama" htmlFor="user-name">
          <Input
            id="user-name"
            name="name"
            defaultValue={user?.name ?? ''}
            placeholder="Nama user"
            required
            disabled={isPending}
          />
        </Field>
        <Field label="Email" htmlFor="user-email">
          <Input
            id="user-email"
            name="email"
            type="email"
            defaultValue={user?.email ?? ''}
            placeholder="nama@email.com"
            required
            disabled={isPending}
          />
        </Field>
        <Field label="Role" htmlFor="user-role">
          <select
            id="user-role"
            name="roleId"
            defaultValue={user?.roleId ?? ''}
            required
            disabled={isPending}
            className="h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--ring) disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="" disabled>
              Pilih role
            </option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status" htmlFor="user-status">
          <select
            id="user-status"
            name="status"
            defaultValue={user?.status ?? 'active'}
            disabled={isPending || isCurrentUser}
            className="h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--ring) disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
          {isCurrentUser ? (
            <input type="hidden" name="status" value="active" />
          ) : null}
        </Field>
        <Field
          label={isEdit ? 'Password Baru (opsional)' : 'Password'}
          htmlFor="user-password"
        >
          <Input
            id="user-password"
            name="password"
            type="password"
            minLength={8}
            required={!isEdit}
            disabled={isPending}
            placeholder={
              isEdit ? 'Kosongkan jika tidak diganti' : 'Minimal 8 karakter'
            }
          />
        </Field>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => router.back()}
        >
          Batal
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Menyimpan...' : 'Simpan User'}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
