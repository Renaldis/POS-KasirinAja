"use server";

import { revalidatePath } from "next/cache";
import {
  PaymentStatus,
  StockMovementType,
  TransactionStatus,
} from "@/generated/prisma/client";
import { voidTransactionSchema } from "@/app/(dashboard)/transactions/_schemas/transaction-schema";
import type { TransactionActionState } from "@/app/(dashboard)/transactions/_types/transaction";
import { requirePermission } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/server";
import { createNotificationWithClient } from "@/lib/notifications";
import { bumpUserNotificationVersion } from "@/lib/notifications/realtime";
import { prisma } from "@/lib/prisma";
import { bumpStoreRealtimeVersion } from "@/lib/realtime/store-events";

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

  await requirePermission(user.id, "transaction.void");

  return {
    userId: user.id,
    storeId: user.storeId,
  };
}

function getFormString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

export async function voidTransactionAction(formData: FormData): Promise<TransactionActionState> {
  try {
    const context = await getActionContext();

    if ("error" in context) {
      return { success: false, message: context.error };
    }

    const parsedInput = voidTransactionSchema.safeParse({
      transactionId: getFormString(formData, "transactionId"),
      reason: getFormString(formData, "reason"),
    });

    if (!parsedInput.success) {
      return {
        success: false,
        message: parsedInput.error.issues[0]?.message ?? "Data void tidak valid",
      };
    }

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: parsedInput.data.transactionId,
        storeId: context.storeId,
      },
      include: {
        items: {
          select: {
            productId: true,
            productName: true,
            qty: true,
          },
        },
      },
    });

    if (!transaction) {
      return {
        success: false,
        message: "Transaksi tidak ditemukan.",
      };
    }

    if (transaction.transactionStatus === TransactionStatus.voided) {
      return {
        success: false,
        message: "Transaksi sudah void.",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: {
          id: transaction.id,
        },
        data: {
          transactionStatus: TransactionStatus.voided,
          paymentStatus:
            transaction.paymentStatus === PaymentStatus.paid
              ? PaymentStatus.refunded
              : transaction.paymentStatus,
          voidedBy: context.userId,
          voidedAt: new Date(),
          voidReason: parsedInput.data.reason,
        },
      });

      if (transaction.transactionStatus === TransactionStatus.completed) {
        for (const item of transaction.items) {
          if (!item.productId) {
            continue;
          }

          const product = await tx.product.update({
            where: {
              id: item.productId,
            },
            data: {
              stock: {
                increment: item.qty,
              },
            },
            select: {
              id: true,
              stock: true,
            },
          });

          await tx.stockMovement.create({
            data: {
              storeId: context.storeId,
              productId: product.id,
              userId: context.userId,
              type: StockMovementType.return,
              qty: item.qty,
              stockBefore: product.stock - item.qty,
              stockAfter: product.stock,
              note: `Void transaksi ${transaction.invoiceNumber}`,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          storeId: context.storeId,
          userId: context.userId,
          action: "transaction.voided",
          entity: "transaction",
          entityId: transaction.id,
          metadata: {
            invoiceNumber: transaction.invoiceNumber,
            reason: parsedInput.data.reason,
          },
        },
      });

      if (transaction.cashierId !== context.userId) {
        await createNotificationWithClient(tx, {
          storeId: context.storeId,
          userId: transaction.cashierId,
          type: "transaction.voided",
          title: "Transaksi di-void",
          message: `Invoice ${transaction.invoiceNumber} di-void: ${parsedInput.data.reason}`,
          actionUrl: `/transactions/${transaction.id}`,
        });
      }
    });

    revalidatePath("/transactions");
    revalidatePath(`/transactions/${transaction.id}`);
    revalidatePath("/products");
    revalidatePath("/pos");
    revalidatePath("/", "layout");
    await bumpStoreRealtimeVersion(context.storeId, [
      "transactions",
      "products",
      "stocks",
      "pos",
    ]);

    if (transaction.cashierId !== context.userId) {
      await bumpUserNotificationVersion(context.storeId, transaction.cashierId);
    }

    return {
      success: true,
      message: "Transaksi berhasil di-void.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Transaksi gagal di-void.",
    };
  }
}
