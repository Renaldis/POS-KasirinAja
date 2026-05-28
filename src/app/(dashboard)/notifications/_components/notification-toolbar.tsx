"use client";

import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { markAllNotificationsReadAction } from "@/app/(dashboard)/notifications/_actions/notification-actions";
import { Button } from "@/components/ui/button";

type NotificationToolbarProps = {
  hasUnread: boolean;
  status?: string;
};

export function NotificationToolbar({ hasUnread, status }: NotificationToolbarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleMarkAllRead() {
    startTransition(async () => {
      const result = await markAllNotificationsReadAction();

      if (!result.success) {
        toast.error(result.message ?? "Notifikasi gagal diperbarui");
        return;
      }

      toast.success(result.message ?? "Semua notifikasi ditandai dibaca");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-white p-4 md:flex-row md:items-center md:justify-between">
      <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          name="status"
          defaultValue={status ?? ""}
          className="h-10 rounded-md border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <option value="">Semua notifikasi</option>
          <option value="unread">Belum dibaca</option>
          <option value="read">Dibaca</option>
        </select>
        <Button type="submit">Filter</Button>
      </form>

      <Button
        type="button"
        variant="outline"
        disabled={!hasUnread || isPending}
        onClick={handleMarkAllRead}
      >
        <CheckCheck className="h-4 w-4" aria-hidden="true" />
        Tandai semua dibaca
      </Button>
    </div>
  );
}
