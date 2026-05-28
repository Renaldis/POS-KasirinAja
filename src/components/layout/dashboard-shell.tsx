'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';

type DashboardShellProps = {
  children: React.ReactNode;
  permissionKeys: string[];
};

export function DashboardShell({
  children,
  permissionKeys,
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
        <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="px-4 py-4 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
