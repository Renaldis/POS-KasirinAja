import { prisma } from "@/lib/prisma";
import type { PermissionKey } from "@/constants/permissions";

export async function getUserPermissionKeys(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      permissionOverrides: {
        select: {
          effect: true,
          permission: {
            select: {
              key: true,
            },
          },
        },
      },
      role: {
        select: {
          slug: true,
          rolePermissions: {
            select: {
              permission: {
                select: {
                  key: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    return new Set<string>();
  }

  const permissionKeys = new Set(
    user.role?.rolePermissions.map((rolePermission) => rolePermission.permission.key) ?? [],
  );

  for (const override of user.permissionOverrides) {
    if (override.effect === "allow") {
      permissionKeys.add(override.permission.key);
    }

    if (override.effect === "deny") {
      permissionKeys.delete(override.permission.key);
    }
  }

  return permissionKeys;
}

export async function hasPermission(userId: string, permission: PermissionKey) {
  const permissionKeys = await getUserPermissionKeys(userId);

  return permissionKeys.has(permission);
}

export async function requirePermission(userId: string, permission: PermissionKey) {
  const allowed = await hasPermission(userId, permission);

  if (!allowed) {
    throw new Error(`Permission denied: ${permission}`);
  }
}
