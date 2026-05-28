import { redirect } from "next/navigation";
import { UserForm } from "@/app/(dashboard)/users/_components/user-form";
import { dedupeRoleOptions } from "@/app/(dashboard)/users/_services/role-options";
import type { UserRoleOption } from "@/app/(dashboard)/users/_types/user";
import { PageShell } from "@/components/shared/page-shell";
import { RoleSlug } from "@/generated/prisma/client";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentUserWithAccess } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

export default async function CreateUserPage() {
  const user = await getCurrentUserWithAccess();

  if (!user) {
    redirect("/auth/login");
  }

  if (!user.storeId) {
    redirect("/auth/register");
  }

  const canManageUsers = await hasPermission(user.id, "user.manage");

  if (!canManageUsers) {
    redirect("/users");
  }

  const isSuperAdmin = user.role?.slug === RoleSlug.super_admin;
  const roles: UserRoleOption[] = await prisma.role.findMany({
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
    },
  });

  return (
    <PageShell
      title="Tambah User"
      description="Buat akun kasir atau admin toko dan tentukan role aksesnya."
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "User", href: "/users" },
        { label: "Tambah" },
      ]}
    >
      <UserForm mode="create" roles={dedupeRoleOptions(roles)} />
    </PageShell>
  );
}
