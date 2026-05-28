'use client';

import { useState } from 'react';
import type { NotificationListItem } from '@/app/(dashboard)/notifications/_types/notification';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';

type DashboardShellProps = {
  children: React.ReactNode;
  notifications: NotificationListItem[];
  permissionKeys: string[];
  storeName: string;
  unreadNotificationCount: number;
  userName: string;
};

export function DashboardShell({
  children,
  notifications,
  permissionKeys,
  storeName,
  unreadNotificationCount,
  userName,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-(--background) text-(--foreground)">
      <DashboardSidebar
        open={sidebarOpen}
        permissionKeys={permissionKeys}
        onOpenChange={setSidebarOpen}
      />
      <div className="min-h-dvh lg:pl-64">
        <DashboardHeader
          notifications={notifications}
          storeName={storeName}
          unreadNotificationCount={unreadNotificationCount}
          userName={userName}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="px-4 py-4 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
