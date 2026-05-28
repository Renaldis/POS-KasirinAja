'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '@/app/(dashboard)/notifications/_actions/notification-actions';
import type { NotificationListItem } from '@/app/(dashboard)/notifications/_types/notification';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type NotificationMenuProps = {
  notifications: NotificationListItem[];
  unreadCount: number;
};

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export function NotificationMenu({
  notifications,
  unreadCount,
}: NotificationMenuProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleMarkRead(id: string) {
    const formData = new FormData();
    formData.set('id', id);

    startTransition(async () => {
      const result = await markNotificationReadAction(formData);

      if (!result.success) {
        toast.error(result.message ?? 'Notifikasi gagal diperbarui');
      }
    });
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      const result = await markAllNotificationsReadAction();

      if (!result.success) {
        toast.error(result.message ?? 'Notifikasi gagal diperbarui');
      }
    });
  }

  return (
    <div className="relative">
      <Button
        size="icon"
        variant="ghost"
        aria-label="Notifikasi"
        aria-expanded={open}
        onClick={() => setOpen((currentOpen) => !currentOpen)}
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 min-w-4 rounded-full bg-(--destructive) px-1 text-[10px] font-semibold leading-4 text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-lg border bg-white shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Notifikasi</p>
              <p className="text-xs text-(--muted-foreground)">
                {unreadCount} belum dibaca
              </p>
            </div>
            {unreadCount > 0 ? (
              <Button
                size="sm"
                variant="ghost"
                type="button"
                disabled={isPending}
                onClick={handleMarkAllRead}
              >
                Tandai semua
              </Button>
            ) : null}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  disabled={isPending || notification.isRead}
                  className="block w-full border-b px-4 py-3 text-left transition-colors hover:bg-(--muted) disabled:cursor-default disabled:hover:bg-white"
                  onClick={() => handleMarkRead(notification.id)}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={cn(
                        'mt-1 h-2 w-2 shrink-0 rounded-full',
                        notification.isRead
                          ? 'bg-transparent'
                          : 'bg-(--primary)',
                      )}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {notification.title}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-xs text-(--muted-foreground)">
                        {notification.message}
                      </span>
                      <span className="mt-1 block text-[11px] text-(--muted-foreground)">
                        {dateFormatter.format(notification.createdAt)}
                      </span>
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-medium">Belum ada notifikasi</p>
                <p className="mt-1 text-xs text-(--muted-foreground)">
                  Aktivitas penting akan muncul di sini.
                </p>
              </div>
            )}
          </div>

          <div className="border-t p-2">
            <Button asChild className="w-full" variant="ghost" size="sm">
              <Link href="/notifications" onClick={() => setOpen(false)}>
                Lihat semua notifikasi
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
