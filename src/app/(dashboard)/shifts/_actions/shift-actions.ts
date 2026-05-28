"use server";

import { revalidatePath } from "next/cache";
import { PaymentMethod, PaymentStatus, ShiftStatus, TransactionStatus } from "@/generated/prisma/client";
import { closeShiftSchema, openShiftSchema } from "@/app/(dashboard)/shifts/_schemas/shift-schema";
import type { ShiftActionState } from "@/app/(dashboard)/shifts/_types/shift";
import { requirePermission } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/server";
import { resolveOpenShiftReminder } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

async function getActionContext(permission: "shift.open" | "shift.close") {
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

  await requirePermission(user.id, permission);

  return {
    userId: user.id,
    storeId: user.storeId,
  };
}

function getFormString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

export async function openShiftAction(formData: FormData): Promise<ShiftActionState> {
  try {
    const context = await getActionContext("shift.open");

    if ("error" in context) {
      return { success: false, message: context.error };
    }

    const parsedInput = openShiftSchema.safeParse({
      openingCash: getFormString(formData, "openingCash"),
    });

    if (!parsedInput.success) {
      return {
        success: false,
        message: parsedInput.error.issues[0]?.message ?? "Data shift tidak valid",
      };
    }

    const activeShift = await prisma.shift.findFirst({
      where: {
        storeId: context.storeId,
        cashierId: context.userId,
        status: ShiftStatus.open,
      },
      select: {
        id: true,
      },
    });

    if (activeShift) {
      return {
        success: false,
        message: "Kamu masih memiliki shift aktif.",
      };
    }

    const shift = await prisma.shift.create({
      data: {
        storeId: context.storeId,
        cashierId: context.userId,
        openingCash: parsedInput.data.openingCash.toFixed(2),
      },
      select: {
        id: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        storeId: context.storeId,
        userId: context.userId,
        action: "shift.opened",
        entity: "shift",
        entityId: shift.id,
        metadata: {
          openingCash: parsedInput.data.openingCash,
        },
      },
    });

    revalidatePath("/shifts");
    revalidatePath("/", "layout");
    await resolveOpenShiftReminder({
      storeId: context.storeId,
      userId: context.userId,
      shiftId: shift.id,
    });

    return {
      success: true,
      message: "Shift berhasil dibuka.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Shift gagal dibuka.",
    };
  }
}

export async function closeShiftAction(formData: FormData): Promise<ShiftActionState> {
  try {
    const context = await getActionContext("shift.close");

    if ("error" in context) {
      return { success: false, message: context.error };
    }

    const parsedInput = closeShiftSchema.safeParse({
      shiftId: getFormString(formData, "shiftId"),
      closingCash: getFormString(formData, "closingCash"),
    });

    if (!parsedInput.success) {
      return {
        success: false,
        message: parsedInput.error.issues[0]?.message ?? "Data shift tidak valid",
      };
    }

    const shift = await prisma.shift.findFirst({
      where: {
        id: parsedInput.data.shiftId,
        storeId: context.storeId,
        cashierId: context.userId,
        status: ShiftStatus.open,
      },
      select: {
        id: true,
        openingCash: true,
      },
    });

    if (!shift) {
      return {
        success: false,
        message: "Shift aktif tidak ditemukan.",
      };
    }

    const cashTransactions = await prisma.transaction.findMany({
      where: {
        shiftId: shift.id,
        paymentMethod: PaymentMethod.cash,
        paymentStatus: PaymentStatus.paid,
        transactionStatus: TransactionStatus.completed,
      },
      select: {
        total: true,
      },
    });

    const cashSales = cashTransactions.reduce((total, transaction) => {
      return total + Number(transaction.total.toString());
    }, 0);
    const openingCash = Number(shift.openingCash.toString());
    const expectedCash = openingCash + cashSales;
    const cashDifference = parsedInput.data.closingCash - expectedCash;

    await prisma.$transaction(async (tx) => {
      await tx.shift.update({
        where: {
          id: shift.id,
        },
        data: {
          closingCash: parsedInput.data.closingCash.toFixed(2),
          expectedCash: expectedCash.toFixed(2),
          cashDifference: cashDifference.toFixed(2),
          status: ShiftStatus.closed,
          closedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          storeId: context.storeId,
          userId: context.userId,
          action: "shift.closed",
          entity: "shift",
          entityId: shift.id,
          metadata: {
            openingCash,
            closingCash: parsedInput.data.closingCash,
            expectedCash,
            cashDifference,
          },
        },
      });
    });

    revalidatePath("/shifts");

    return {
      success: true,
      message: "Shift berhasil ditutup.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Shift gagal ditutup.",
    };
  }
}
