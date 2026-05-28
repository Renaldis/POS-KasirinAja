"use server";

import { revalidatePath } from "next/cache";
import { updateStoreSettingsSchema } from "@/app/(dashboard)/settings/_schemas/setting-schema";
import type { SettingActionState } from "@/app/(dashboard)/settings/_types/setting";
import { requirePermission } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/server";
import { getOptionalImageFile, uploadImage } from "@/lib/cloudinary";
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

  await requirePermission(user.id, "setting.store.update");

  return {
    userId: user.id,
    storeId: user.storeId,
  };
}

function getFormString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

export async function updateStoreSettingsAction(
  formData: FormData,
): Promise<SettingActionState> {
  try {
    const context = await getActionContext();

    if ("error" in context) {
      return { success: false, message: context.error };
    }

    const parsedInput = updateStoreSettingsSchema.safeParse({
      name: getFormString(formData, "name"),
      address: getFormString(formData, "address"),
      phone: getFormString(formData, "phone"),
    });

    if (!parsedInput.success) {
      return {
        success: false,
        message: parsedInput.error.issues[0]?.message ?? "Data toko tidak valid",
      };
    }

    const input = parsedInput.data;
    const logoFile = getOptionalImageFile(formData, "logo");
    const logoUrl = logoFile
      ? await uploadImage(logoFile, `kasirinaja/${context.storeId}/settings`)
      : undefined;

    await prisma.$transaction(async (tx) => {
      await tx.store.update({
        where: {
          id: context.storeId,
        },
        data: {
          name: input.name,
          address: input.address || null,
          phone: input.phone || null,
          ...(logoUrl ? { logoUrl } : {}),
        },
      });

      await tx.auditLog.create({
        data: {
          storeId: context.storeId,
          userId: context.userId,
          action: "setting.store.updated",
          entity: "store",
          entityId: context.storeId,
          metadata: {
            name: input.name,
            address: input.address,
            phone: input.phone,
            logoUrl,
          },
        },
      });
    });

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    revalidatePath("/pos");
    revalidatePath("/transactions");

    return {
      success: true,
      message: "Setting toko berhasil diperbarui.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Setting toko gagal diperbarui.",
    };
  }
}
