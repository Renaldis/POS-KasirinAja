"use server";

import { revalidatePath } from "next/cache";
import type { NotificationActionState } from "@/app/(dashboard)/notifications/_types/notification";
import { getCurrentUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

async function getActionContext() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return {
      error: "Sesi tidak ditemukan. Silakan login ulang.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: {
      id: true,
      storeId: true,
    },
  });

  if (!user?.storeId) {
    return {
      error: "Toko belum dibuat. Selesaikan setup toko terlebih dahulu.",
    };
  }

  return {
    userId: user.id,
    storeId: user.storeId,
  };
}

function getFormString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

export async function markNotificationReadAction(
  formData: FormData,
): Promise<NotificationActionState> {
  try {
    const context = await getActionContext();

    if ("error" in context) {
      return { success: false, message: context.error };
    }

    const id = getFormString(formData, "id");

    if (!id) {
      return {
        success: false,
        message: "Notifikasi tidak valid.",
      };
    }

    await prisma.notification.updateMany({
      where: {
        id,
        storeId: context.storeId,
        OR: [{ userId: context.userId }, { userId: null }],
      },
      data: {
        isRead: true,
      },
    });

    revalidatePath("/notifications");
    revalidatePath("/", "layout");

    return {
      success: true,
      message: "Notifikasi ditandai dibaca.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Notifikasi gagal diperbarui.",
    };
  }
}

export async function markAllNotificationsReadAction(): Promise<NotificationActionState> {
  try {
    const context = await getActionContext();

    if ("error" in context) {
      return { success: false, message: context.error };
    }

    await prisma.notification.updateMany({
      where: {
        storeId: context.storeId,
        isRead: false,
        OR: [{ userId: context.userId }, { userId: null }],
      },
      data: {
        isRead: true,
      },
    });

    revalidatePath("/notifications");
    revalidatePath("/", "layout");

    return {
      success: true,
      message: "Semua notifikasi ditandai dibaca.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Notifikasi gagal diperbarui.",
    };
  }
}
