import { notFound, redirect } from "next/navigation";
import { RoleForm } from "@/app/(dashboard)/roles/_components/role-form";
import { groupPermissionsByModule } from "@/app/(dashboard)/roles/_services/permission-groups";
import type {
  PermissionOption,
  RoleFormValue,
} from "@/app/(dashboard)/roles/_types/role";
import { PageShell } from "@/components/shared/page-shell";
import { globalPermissionKeys } from "@/constants/permissions";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentUserWithAccess } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

type EditRolePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditRolePage({ params }: EditRolePageProps) {
  const currentUser = await getCurrentUserWithAccess();
  const { id } = await params;

  if (!currentUser) {
    redirect("/auth/login");
  }

  if (!currentUser.storeId) {
    redirect("/auth/register");
  }

  const canManageRoles = await hasPermission(currentUser.id, "role.manage");

  if (!canManageRoles) {
    redirect("/roles");
  }

  const [role, permissions] = await Promise.all([
    prisma.role.findFirst({
      where: {
        id,
        storeId: currentUser.storeId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        isSystem: true,
        rolePermissions: {
          select: {
            permissionId: true,
          },
        },
      },
    }),
    prisma.permission.findMany({
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
    }),
  ]);

  if (!role) {
    notFound();
  }

  const roleValue: RoleFormValue = {
    id: role.id,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    permissionIds: role.rolePermissions.map((rolePermission) => rolePermission.permissionId),
  };

  return (
    <PageShell
      title="Edit Role"
      description="Ubah nama, deskripsi, dan permission role custom."
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Role", href: "/roles" },
        { label: role.name },
      ]}
    >
      <RoleForm
        mode="edit"
        permissionGroups={groupPermissionsByModule(permissions as PermissionOption[])}
        role={roleValue}
      />
    </PageShell>
  );
}
