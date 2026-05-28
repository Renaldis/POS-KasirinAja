import { notFound, redirect } from 'next/navigation';
import { UserForm } from '@/app/(dashboard)/users/_components/user-form';
import { dedupeRoleOptions } from '@/app/(dashboard)/users/_services/role-options';
import type { UserFormValue } from '@/app/(dashboard)/users/_types/user';
import { PageShell } from '@/components/shared/page-shell';
import { hasPermission } from '@/lib/auth/permissions';
import { getCurrentUserWithAccess } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma';

type EditUserPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditUserPage({ params }: EditUserPageProps) {
  const currentUser = await getCurrentUserWithAccess();
  const { id } = await params;

  if (!currentUser) {
    redirect('/auth/login');
  }

  if (!currentUser.storeId) {
    redirect('/auth/register');
  }

  const canManageUsers = await hasPermission(currentUser.id, 'user.manage');

  if (!canManageUsers) {
    redirect('/users');
  }

  const [roles, user] = await Promise.all([
    prisma.role.findMany({
      where: {
        OR: [{ storeId: null }, { storeId: currentUser.storeId }],
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        storeId: true,
        name: true,
        description: true,
        isSystem: true,
      },
    }),
    prisma.user.findFirst({
      where: {
        id,
        storeId: currentUser.storeId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true,
        status: true,
      },
    }),
  ]);

  if (!user) {
    notFound();
  }

  const roleOptions = dedupeRoleOptions(roles, user.roleId);
  const userValue: UserFormValue = user;

  return (
    <PageShell
      title="Edit User"
      description="Ubah profil, role, status, atau reset password user."
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'User & Role', href: '/users' },
        { label: user.name },
      ]}
    >
      <UserForm
        isCurrentUser={user.id === currentUser.id}
        mode="edit"
        roles={roleOptions}
        user={userValue}
      />
    </PageShell>
  );
}
