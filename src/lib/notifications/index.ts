import { UserStatus, type PrismaClient } from "@/generated/prisma/client";
import type { PermissionKey } from "@/constants/permissions";
import { prisma } from "@/lib/prisma";

type NotificationInput = {
  storeId: string;
  userId?: string | null;
  type: string;
  title: string;
  message: string;
};

type PermissionUser = {
  id: string;
  role: {
    rolePermissions: {
      permission: {
        key: string;
      };
    }[];
  } | null;
  permissionOverrides: {
    effect: "allow" | "deny";
    permission: {
      key: string;
    };
  }[];
};

function userHasPermission(user: PermissionUser, permission: PermissionKey) {
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

  return permissionKeys.has(permission);
}

export async function notifyUser(input: NotificationInput) {
  await prisma.notification.create({
    data: {
      storeId: input.storeId,
      userId: input.userId ?? null,
      type: input.type,
      title: input.title,
      message: input.message,
    },
  });
}

export async function notifyUsersWithPermission({
  storeId,
  permission,
  type,
  title,
  message,
  excludeUserId,
}: NotificationInput & {
  permission: PermissionKey;
  excludeUserId?: string;
}) {
  const users = await prisma.user.findMany({
    where: {
      storeId,
      status: UserStatus.active,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: {
      id: true,
      role: {
        select: {
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
    },
  });
  const targetUsers = users.filter((user) => userHasPermission(user, permission));

  if (targetUsers.length === 0) {
    return;
  }

  await prisma.notification.createMany({
    data: targetUsers.map((user) => ({
      storeId,
      userId: user.id,
      type,
      title,
      message,
    })),
  });
}

export async function createNotificationWithClient(
  tx: Pick<PrismaClient, "notification">,
  input: NotificationInput,
) {
  await tx.notification.create({
    data: {
      storeId: input.storeId,
      userId: input.userId ?? null,
      type: input.type,
      title: input.title,
      message: input.message,
    },
  });
}
