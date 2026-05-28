'use client';

import { Menu, Search } from 'lucide-react';
import type { NotificationListItem } from '@/app/(dashboard)/notifications/_types/notification';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NotificationMenu } from '@/components/layout/notification-menu';

type DashboardHeaderProps = {
  notifications: NotificationListItem[];
  notificationVersion: number;
  storeName: string;
  unreadNotificationCount: number;
  userName: string;
  onMenuClick: () => void;
};

export function DashboardHeader({
  notifications,
  notificationVersion,
  storeName,
  unreadNotificationCount,
  userName,
  onMenuClick,
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Button
          className="lg:hidden"
          size="icon"
          variant="ghost"
          aria-label="Buka menu"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
        <div className="relative hidden w-full max-w-md sm:block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--muted-foreground)"
            aria-hidden="true"
          />
          <Input
            className="pl-9"
            placeholder="Cari transaksi, produk, atau invoice"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <NotificationMenu
            notifications={notifications}
            notificationVersion={notificationVersion}
            unreadCount={unreadNotificationCount}
          />
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium">{userName}</p>
            <p className="text-xs text-(--muted-foreground)">{storeName}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
