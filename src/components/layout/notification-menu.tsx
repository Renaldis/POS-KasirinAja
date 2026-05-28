'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { useEffect, useRef, useState, useTransition } from 'react';
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
  notificationVersion: number;
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
  notificationVersion,
  unreadCount,
}: NotificationMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(notifications);
  const [currentUnreadCount, setCurrentUnreadCount] = useState(unreadCount);
  const versionRef = useRef(notificationVersion);
  const knownNotificationIdsRef = useRef(new Set(notifications.map((notification) => notification.id)));
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    versionRef.current = notificationVersion;
    knownNotificationIdsRef.current = new Set(
      notifications.map((notification) => notification.id),
    );

    const timeoutId = window.setTimeout(() => {
      setItems(notifications);
      setCurrentUnreadCount(unreadCount);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [notifications, notificationVersion, unreadCount]);

  useEffect(() => {
    let active = true;
    let eventSource: EventSource | null = null;
    let intervalId: number | null = null;

    async function syncNotifications() {
      try {
        const response = await fetch(`/api/notifications?version=${versionRef.current}`, {
          cache: 'no-store',
        });

        if (!active || !response.ok) {
          return;
        }

        const result = await response.json();

        if (!result.changed) {
          versionRef.current = result.version;
          return;
        }

        const nextItems = result.notifications.map(
          (notification: NotificationListItem & { createdAt: string }) => ({
            ...notification,
            createdAt: new Date(notification.createdAt),
          }),
        );
        const newUnreadNotification = nextItems.find(
          (notification: NotificationListItem) =>
            !notification.isRead && !knownNotificationIdsRef.current.has(notification.id),
        );

        versionRef.current = result.version;
        setCurrentUnreadCount(result.unreadCount);
        setItems(nextItems);
        knownNotificationIdsRef.current = new Set(
          nextItems.map((notification: NotificationListItem) => notification.id),
        );

        if (newUnreadNotification) {
          toast(newUnreadNotification.title, {
            description: newUnreadNotification.message,
          });
        }
      } catch {
        // Keep the current UI; Redis/API polling is a realtime enhancement.
      }
    }

    function startPolling() {
      if (intervalId) {
        return;
      }

      intervalId = window.setInterval(syncNotifications, 4000);
    }

    if ('EventSource' in window) {
      eventSource = new EventSource('/api/notifications/stream');
      eventSource.addEventListener('notification', () => {
        void syncNotifications();
      });
      eventSource.onerror = () => {
        eventSource?.close();
        eventSource = null;
        startPolling();
      };
    } else {
      startPolling();
    }

    if (document.visibilityState === 'visible') {
      void syncNotifications();
    }

    return () => {
      active = false;
      eventSource?.close();

      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  function handleNotificationClick(notification: NotificationListItem) {
    const actionUrl = notification.actionUrl;

    if (notification.isRead) {
      if (actionUrl) {
        setOpen(false);
        router.push(actionUrl);
      }

      return;
    }

    const formData = new FormData();
    formData.set('id', notification.id);

    startTransition(async () => {
      const result = await markNotificationReadAction(formData);

      if (!result.success) {
        toast.error(result.message ?? 'Notifikasi gagal diperbarui');
        return;
      }

      setItems((currentItems) =>
        currentItems.map((currentNotification) =>
          currentNotification.id === notification.id
            ? { ...currentNotification, isRead: true }
            : currentNotification,
        ),
      );
      setCurrentUnreadCount((currentCount) => Math.max(0, currentCount - 1));

      if (actionUrl) {
        setOpen(false);
        router.push(actionUrl);
      }
    });
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      const result = await markAllNotificationsReadAction();

      if (!result.success) {
        toast.error(result.message ?? 'Notifikasi gagal diperbarui');
        return;
      }

      setItems((currentItems) =>
        currentItems.map((notification) => ({ ...notification, isRead: true })),
      );
      setCurrentUnreadCount(0);
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
        {currentUnreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 min-w-4 rounded-full bg-(--destructive) px-1 text-[10px] font-semibold leading-4 text-white">
            {currentUnreadCount > 9 ? '9+' : currentUnreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-lg border bg-white shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Notifikasi</p>
              <p className="text-xs text-(--muted-foreground)">
                {currentUnreadCount} belum dibaca
              </p>
            </div>
            {currentUnreadCount > 0 ? (
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
            {items.length > 0 ? (
              items.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  disabled={isPending}
                  className="block w-full border-b px-4 py-3 text-left transition-colors hover:bg-(--muted) disabled:cursor-default disabled:hover:bg-white"
                  onClick={() => handleNotificationClick(notification)}
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
