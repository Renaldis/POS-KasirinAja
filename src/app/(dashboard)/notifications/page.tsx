import { redirect } from "next/navigation";
import { NotificationList } from "@/app/(dashboard)/notifications/_components/notification-list";
import type { NotificationListItem } from "@/app/(dashboard)/notifications/_types/notification";
import { ListPagination } from "@/components/shared/list-pagination";
import { PageShell } from "@/components/shared/page-shell";
import { getCurrentUserWithAccess } from "@/lib/auth/server";
import { normalizePage, normalizePageSize } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

type NotificationsPageProps = {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
  }>;
};

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const user = await getCurrentUserWithAccess();
  const filters = await searchParams;

  if (!user) {
    redirect("/auth/login");
  }

  if (!user.storeId) {
    redirect("/auth/register");
  }

  const page = normalizePage(filters.page);
  const pageSize = normalizePageSize(filters.pageSize);
  const skip = (page - 1) * pageSize;
  const notificationWhere = {
    storeId: user.storeId,
    OR: [{ userId: user.id }, { userId: null }],
  };

  const [notifications, totalNotifications] = await Promise.all([
    prisma.notification.findMany({
      where: notificationWhere,
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: pageSize,
    }),
    prisma.notification.count({
      where: notificationWhere,
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
    <PageShell
      title="Notifikasi"
      description="Pantau aktivitas penting yang membutuhkan perhatian."
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Notifikasi" },
      ]}
    >
      <div className="space-y-4">
        <NotificationList notifications={notificationItems} />
        <ListPagination
          basePath="/notifications"
          page={page}
          pageSize={pageSize}
          totalItems={totalNotifications}
        />
      </div>
    </PageShell>
  );
}
