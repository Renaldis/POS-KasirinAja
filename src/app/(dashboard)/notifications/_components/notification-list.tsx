'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { markNotificationReadAction } from '@/app/(dashboard)/notifications/_actions/notification-actions';
import type { NotificationListItem } from '@/app/(dashboard)/notifications/_types/notification';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type NotificationListProps = {
  notifications: NotificationListItem[];
};

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function NotificationList({ notifications }: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed bg-white p-6 text-center">
        <div>
          <h2 className="text-base font-semibold">Belum ada notifikasi</h2>
          <p className="mt-1 text-sm text-(--muted-foreground)">
            Notifikasi penting dari transaksi, pembayaran, dan shift akan tampil
            di sini.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="divide-y">
        {notifications.map((notification) => (
          <NotificationRow key={notification.id} notification={notification} />
        ))}
      </div>
    </div>
  );
}

function NotificationRow({
  notification,
}: {
  notification: NotificationListItem;
}) {
  const [isPending, startTransition] = useTransition();

  function handleMarkRead() {
    const formData = new FormData();
    formData.set('id', notification.id);

    startTransition(async () => {
      const result = await markNotificationReadAction(formData);

      if (!result.success) {
        toast.error(result.message ?? 'Notifikasi gagal diperbarui');
      }
    });
  }

  return (
    <div className="grid gap-3 px-4 py-4 xl:grid-cols-[1fr_170px_140px] xl:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant={notification.isRead ? 'outline' : 'default'}>
            {notification.isRead ? 'Dibaca' : 'Baru'}
          </Badge>
          <p className="truncate text-sm font-medium">{notification.title}</p>
        </div>
        <p className="mt-1 text-sm text-(--muted-foreground)">
          {notification.message}
        </p>
        <p className="mt-1 text-xs text-(--muted-foreground)">
          {notification.type}
        </p>
      </div>
      <p className="text-sm text-(--muted-foreground)">
        {dateFormatter.format(notification.createdAt)}
      </p>
      <div className="flex justify-end">
        {!notification.isRead ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={handleMarkRead}
          >
            Tandai dibaca
          </Button>
        ) : null}
      </div>
    </div>
  );
}
