import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { RoleFilters } from "@/app/(dashboard)/roles/_components/role-filters";
import { RoleList } from "@/app/(dashboard)/roles/_components/role-list";
import type { RoleListItem } from "@/app/(dashboard)/roles/_types/role";
import { ListPagination } from "@/components/shared/list-pagination";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { RoleSlug } from "@/generated/prisma/client";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentUserWithAccess } from "@/lib/auth/server";
import { normalizePage, normalizePageSize } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

type RolesPageProps = {
  searchParams: Promise<{
    q?: string;
    type?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function RolesPage({ searchParams }: RolesPageProps) {
  const user = await getCurrentUserWithAccess();
  const filters = await searchParams;

  if (!user) {
    redirect("/auth/login");
  }

  if (!user.storeId) {
    redirect("/auth/register");
  }

  const [canManageRoles, canManageUsers] = await Promise.all([
    hasPermission(user.id, "role.manage"),
    hasPermission(user.id, "user.manage"),
  ]);

  if (!canManageRoles) {
    redirect("/dashboard");
  }

  const search = filters.q?.trim() ?? "";
  const type = filters.type?.trim() || undefined;
  const page = normalizePage(filters.page);
  const pageSize = normalizePageSize(filters.pageSize);
  const isSuperAdmin = user.role?.slug === RoleSlug.super_admin;

  const roles = await prisma.role.findMany({
    where: {
      OR: isSuperAdmin
        ? [{ storeId: user.storeId }, { storeId: null, slug: RoleSlug.super_admin }]
        : [{ storeId: user.storeId }],
    },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    select: {
      id: true,
      storeId: true,
      name: true,
      description: true,
      isSystem: true,
      createdAt: true,
      _count: {
        select: {
          rolePermissions: true,
        },
      },
    },
  });

  const roleIds = roles.map((role) => role.id);
  const roleUserCounts = await prisma.user.groupBy({
    by: ["roleId"],
    where: {
      storeId: user.storeId,
      roleId: {
        in: roleIds,
      },
    },
    _count: {
      _all: true,
    },
  });
  const userCountByRoleId = new Map(
    roleUserCounts.map((item) => [item.roleId, item._count._all]),
  );

  const storeRoleNames = new Set(
    roles.filter((role) => role.storeId === user.storeId).map((role) => role.name),
  );
  const dedupedRoles = roles.filter(
    (role) => role.storeId === user.storeId || !storeRoleNames.has(role.name),
  );
  const filteredRoles = dedupedRoles.filter((role) => {
    const matchesSearch = search
      ? role.name.toLowerCase().includes(search.toLowerCase())
      : true;
    const matchesType =
      type === "system" ? role.isSystem : type === "custom" ? !role.isSystem : true;

    return matchesSearch && matchesType;
  });
  const totalRoles = filteredRoles.length;
  const paginatedRoles = filteredRoles.slice((page - 1) * pageSize, page * pageSize);
  const roleItems: RoleListItem[] = paginatedRoles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    isGlobal: !role.storeId,
    userCount: userCountByRoleId.get(role.id) ?? 0,
    permissionCount: role._count.rolePermissions,
    createdAt: role.createdAt,
  }));

  return (
    <PageShell
      title="Role"
      description="Kelola role custom dan permission akses per modul."
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Role" },
      ]}
      actions={
        <>
          {canManageUsers ? (
            <Button asChild variant="outline">
              <Link href="/users">
                <Users className="h-4 w-4" aria-hidden="true" />
                User
              </Link>
            </Button>
          ) : null}
          <Button asChild>
            <Link href="/roles/create">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Tambah Role
            </Link>
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <RoleFilters search={search} type={type} />
        <RoleList canManage={canManageRoles} roles={roleItems} />
        <ListPagination
          basePath="/roles"
          page={page}
          pageSize={pageSize}
          totalItems={totalRoles}
          searchParams={{ q: search, type }}
        />
      </div>
    </PageShell>
  );
}
