import { redirect } from "next/navigation";
import type { NotificationListItem } from "@/app/(dashboard)/notifications/_types/notification";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getUserPermissionKeys } from "@/lib/auth/permissions";
import { getCurrentUserWithAccess } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUserWithAccess();

  if (!user) {
    redirect("/auth/login");
  }

  if (!user.storeId) {
    redirect("/auth/register");
  }

  const notificationWhere = {
    storeId: user.storeId,
    OR: [{ userId: user.id }, { userId: null }],
  };
  const [permissionKeys, notifications, unreadNotificationCount] = await Promise.all([
    getUserPermissionKeys(user.id),
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
  const notificationItems: NotificationListItem[] = notifications.map((notification) => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    isRead: notification.isRead,
    createdAt: notification.createdAt,
  }));

  return (
    <DashboardShell
      notifications={notificationItems}
      permissionKeys={[...permissionKeys]}
      storeName={user.store?.name ?? "KasirinAja"}
      unreadNotificationCount={unreadNotificationCount}
      userName={user.name}
    >
      {children}
    </DashboardShell>
  );
}
