import { UserStatus, type PrismaClient } from "@/generated/prisma/client";
import type { PermissionKey } from "@/constants/permissions";
import {
  bumpStoreNotificationVersion,
  bumpUserNotificationVersion,
} from "@/lib/notifications/realtime";
import { prisma } from "@/lib/prisma";

type NotificationInput = {
  storeId: string;
  userId?: string | null;
  type: string;
  title: string;
  message: string;
  actionUrl?: string | null;
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
      actionUrl: input.actionUrl ?? null,
    },
  });

  if (input.userId) {
    await bumpUserNotificationVersion(input.storeId, input.userId);
  } else {
    await bumpStoreNotificationVersion(input.storeId);
  }
}

export async function notifyUsersWithPermission({
  storeId,
  permission,
  type,
  title,
  message,
  actionUrl,
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
      actionUrl: actionUrl ?? null,
    })),
  });

  await Promise.all(
    targetUsers.map((user) => bumpUserNotificationVersion(storeId, user.id)),
  );
}

export async function notifyUsersWithAnyPermission({
  storeId,
  permissions,
  type,
  title,
  message,
  actionUrl,
  excludeUserId,
}: NotificationInput & {
  permissions: PermissionKey[];
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
  const targetUsers = users.filter((user) =>
    permissions.some((permission) => userHasPermission(user, permission)),
  );

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
      actionUrl: actionUrl ?? null,
    })),
  });

  await Promise.all(
    targetUsers.map((user) => bumpUserNotificationVersion(storeId, user.id)),
  );
}

export async function notifyLowStockOnce({
  storeId,
  productId,
}: {
  storeId: string;
  productId: string;
}) {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      storeId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      stock: true,
      minimumStock: true,
      unit: true,
    },
  });

  if (!product || product.stock > product.minimumStock) {
    return;
  }

  const type = `stock.low.${product.id}`;
  const existingUnreadNotification = await prisma.notification.findFirst({
    where: {
      storeId,
      type,
      isRead: false,
    },
    select: {
      id: true,
    },
  });

  if (existingUnreadNotification) {
    return;
  }

  await notifyUsersWithAnyPermission({
    storeId,
    permissions: ["stock.read", "stock.adjustment.create"],
    type,
    title: "Stok produk menipis",
    message: `${product.name} tersisa ${product.stock} ${product.unit}. Minimum stok ${product.minimumStock} ${product.unit}.`,
    actionUrl: `/stocks/products/${product.id}`,
  });
}

export async function resolveLowStockNotification({
  storeId,
  productId,
}: {
  storeId: string;
  productId: string;
}) {
  const type = `stock.low.${productId}`;
  const unreadNotifications = await prisma.notification.findMany({
    where: {
      storeId,
      type,
      isRead: false,
    },
    select: {
      userId: true,
    },
  });

  if (unreadNotifications.length === 0) {
    return;
  }

  await prisma.notification.updateMany({
    where: {
      storeId,
      type,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });

  const userIds = new Set(
    unreadNotifications
      .map((notification) => notification.userId)
      .filter((userId): userId is string => Boolean(userId)),
  );
  const hasStoreNotification = unreadNotifications.some(
    (notification) => notification.userId === null,
  );

  await Promise.all([
    ...Array.from(userIds).map((userId) => bumpUserNotificationVersion(storeId, userId)),
    hasStoreNotification ? bumpStoreNotificationVersion(storeId) : Promise.resolve(),
  ]);
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
      actionUrl: input.actionUrl ?? null,
    },
  });
}
