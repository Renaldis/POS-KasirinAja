import Link from "next/link";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { UserFilters } from "@/app/(dashboard)/users/_components/user-filters";
import { UserList } from "@/app/(dashboard)/users/_components/user-list";
import { dedupeRoleOptions } from "@/app/(dashboard)/users/_services/role-options";
import type { UserListItem } from "@/app/(dashboard)/users/_types/user";
import { ListPagination } from "@/components/shared/list-pagination";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { UserStatus } from "@/generated/prisma/client";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentUserWithAccess } from "@/lib/auth/server";
import { normalizePage, normalizePageSize } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

type UsersPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    roleId?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const user = await getCurrentUserWithAccess();
  const filters = await searchParams;

  if (!user) {
    redirect("/auth/login");
  }

  if (!user.storeId) {
    redirect("/auth/register");
  }

  const canManageUsers = await hasPermission(user.id, "user.manage");

  if (!canManageUsers) {
    redirect("/dashboard");
  }

  const search = filters.q?.trim() ?? "";
  const status = filters.status?.trim() || undefined;
  const roleId = filters.roleId?.trim() || undefined;
  const page = normalizePage(filters.page);
  const pageSize = normalizePageSize(filters.pageSize);
  const skip = (page - 1) * pageSize;

  const userWhere = {
    storeId: user.storeId,
    ...(status === UserStatus.active ? { status: UserStatus.active } : {}),
    ...(status === UserStatus.inactive ? { status: UserStatus.inactive } : {}),
    ...(roleId ? { roleId } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [roles, users, totalUsers] = await Promise.all([
    prisma.role.findMany({
      where: {
        OR: [{ storeId: null }, { storeId: user.storeId }],
      },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      select: {
        id: true,
        storeId: true,
        name: true,
        description: true,
        isSystem: true,
      },
    }),
    prisma.user.findMany({
      where: userWhere,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        role: {
          select: {
            name: true,
            description: true,
          },
        },
      },
      skip,
      take: pageSize,
    }),
    prisma.user.count({
      where: userWhere,
    }),
  ]);

  const roleOptions = dedupeRoleOptions(roles, roleId);
  const userItems: UserListItem[] = users.map((item) => ({
    id: item.id,
    name: item.name,
    email: item.email,
    status: item.status,
    roleName: item.role?.name ?? null,
    roleDescription: item.role?.description ?? null,
    createdAt: item.createdAt,
    isCurrentUser: item.id === user.id,
  }));

  return (
    <PageShell
      title="User & Role"
      description="Kelola user toko, status akun, dan role akses."
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "User & Role" },
      ]}
      actions={
        <Button asChild>
          <Link href="/users/create">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Tambah User
          </Link>
        </Button>
      }
    >
      <div className="space-y-4">
        <UserFilters
          roles={roleOptions}
          roleId={roleId}
          search={search}
          status={status}
        />
        <UserList canManage={canManageUsers} users={userItems} />
        <ListPagination
          basePath="/users"
          page={page}
          pageSize={pageSize}
          totalItems={totalUsers}
          searchParams={{ q: search, status, roleId }}
        />
      </div>
    </PageShell>
  );
}
