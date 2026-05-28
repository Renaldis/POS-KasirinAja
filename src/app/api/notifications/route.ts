import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { getNotificationVersion } from "@/lib/notifications/realtime";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: {
      id: currentUser.id,
    },
    select: {
      id: true,
      storeId: true,
    },
  });

  if (!user?.storeId) {
    return NextResponse.json({ message: "Store not found" }, { status: 400 });
  }

  const url = new URL(request.url);
  const clientVersion = Number(url.searchParams.get("version") ?? 0);
  const version = await getNotificationVersion(user.storeId, user.id);

  if (clientVersion === version) {
    return NextResponse.json({
      changed: false,
      version,
    });
  }

  const notificationWhere = {
    storeId: user.storeId,
    OR: [{ userId: user.id }, { userId: null }],
  };
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: notificationWhere,
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),
    prisma.notification.count({
      where: {
        ...notificationWhere,
        isRead: false,
      },
    }),
  ]);

  return NextResponse.json({
    changed: true,
    version,
    unreadCount,
    notifications: notifications.map((notification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      actionUrl: notification.actionUrl,
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString(),
    })),
  });
}
