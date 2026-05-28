import { redirect } from "next/navigation";
import { RoleForm } from "@/app/(dashboard)/roles/_components/role-form";
import { groupPermissionsByModule } from "@/app/(dashboard)/roles/_services/permission-groups";
import type { PermissionOption } from "@/app/(dashboard)/roles/_types/role";
import { PageShell } from "@/components/shared/page-shell";
import { globalPermissionKeys } from "@/constants/permissions";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentUserWithAccess } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

export default async function CreateRolePage() {
  const user = await getCurrentUserWithAccess();

  if (!user) {
    redirect("/auth/login");
  }

  if (!user.storeId) {
    redirect("/auth/register");
  }

  const canManageRoles = await hasPermission(user.id, "role.manage");

  if (!canManageRoles) {
    redirect("/roles");
  }

  const permissions: PermissionOption[] = await prisma.permission.findMany({
    where: {
      key: {
        notIn: [...globalPermissionKeys],
      },
    },
    orderBy: [{ module: "asc" }, { key: "asc" }],
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
      module: true,
    },
  });

  return (
    <PageShell
      title="Tambah Role"
      description="Buat role custom dan pilih permission yang dibutuhkan."
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Role", href: "/roles" },
        { label: "Tambah" },
      ]}
    >
      <RoleForm mode="create" permissionGroups={groupPermissionsByModule(permissions)} />
    </PageShell>
  );
}
