"use server";

import { revalidatePath } from "next/cache";
import {
  PaymentMethod,
  PaymentStatus,
  StockMovementType,
  TransactionStatus,
} from "@/generated/prisma/client";
import {
  paymentIdSchema,
  rejectPaymentSchema,
} from "@/app/(dashboard)/payments/_schemas/payment-schema";
import type { PaymentActionState } from "@/app/(dashboard)/payments/_types/payment";
import { requirePermission } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/server";
import { getOptionalImageFile, uploadImage } from "@/lib/cloudinary";
import { createNotificationWithClient, notifyLowStockOnce } from "@/lib/notifications";
import { bumpUserNotificationVersion } from "@/lib/notifications/realtime";
import { prisma } from "@/lib/prisma";
import { bumpStoreRealtimeVersion } from "@/lib/realtime/store-events";

async function getUserContext(permission?: "payment.manual.approve" | "payment.manual.reject") {
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

  if (permission) {
    await requirePermission(user.id, permission);
  }

  return {
    userId: user.id,
    storeId: user.storeId,
  };
}

function getFormString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

async function getManualPayment(paymentId: string, storeId: string) {
  return prisma.payment.findFirst({
    where: {
      id: paymentId,
      method: PaymentMethod.manual_transfer,
      transaction: {
        storeId,
      },
    },
    include: {
      transaction: {
        include: {
          items: true,
        },
      },
    },
  });
}

export async function uploadPaymentProofAction(formData: FormData): Promise<PaymentActionState> {
  try {
    const context = await getUserContext();

    if ("error" in context) {
      return { success: false, message: context.error };
    }

    const parsedInput = paymentIdSchema.safeParse({
      paymentId: getFormString(formData, "paymentId"),
    });

    if (!parsedInput.success) {
      return {
        success: false,
        message: parsedInput.error.issues[0]?.message ?? "Pembayaran tidak valid",
      };
    }

    const payment = await getManualPayment(parsedInput.data.paymentId, context.storeId);

    if (!payment) {
      return {
        success: false,
        message: "Pembayaran tidak ditemukan.",
      };
    }

    if (payment.status !== PaymentStatus.pending) {
      return {
        success: false,
        message: "Bukti hanya bisa diupload untuk pembayaran pending.",
      };
    }

    const proofFile = getOptionalImageFile(formData, "proof");

    if (!proofFile) {
      return {
        success: false,
        message: "Bukti transfer wajib diupload.",
      };
    }

    const proofUrl = await uploadImage(
      proofFile,
      `kasirinaja/${context.storeId}/payment-proofs`,
    );

    await prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        proofUrl,
      },
    });

    await prisma.auditLog.create({
      data: {
        storeId: context.storeId,
        userId: context.userId,
        action: "payment.proof.uploaded",
        entity: "payment",
        entityId: payment.id,
        metadata: {
          invoiceNumber: payment.transaction.invoiceNumber,
          proofUrl,
        },
      },
    });

    revalidatePath("/payments");
    revalidatePath(`/payments/${payment.id}`);
    await bumpStoreRealtimeVersion(context.storeId, ["payments"]);

    return {
      success: true,
      message: "Bukti transfer berhasil diupload.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Bukti transfer gagal diupload.",
    };
  }
}

export async function approveManualPaymentAction(formData: FormData): Promise<PaymentActionState> {
  try {
    const context = await getUserContext("payment.manual.approve");

    if ("error" in context) {
      return { success: false, message: context.error };
    }

    const parsedInput = paymentIdSchema.safeParse({
      paymentId: getFormString(formData, "paymentId"),
    });

    if (!parsedInput.success) {
      return {
        success: false,
        message: parsedInput.error.issues[0]?.message ?? "Pembayaran tidak valid",
      };
    }

    const payment = await getManualPayment(parsedInput.data.paymentId, context.storeId);

    if (!payment) {
      return {
        success: false,
        message: "Pembayaran tidak ditemukan.",
      };
    }

    if (payment.status !== PaymentStatus.pending) {
      return {
        success: false,
        message: "Pembayaran sudah diproses.",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: PaymentStatus.paid,
          approvedBy: context.userId,
          approvedAt: new Date(),
        },
      });

      await tx.transaction.update({
        where: {
          id: payment.transactionId,
        },
        data: {
          paymentStatus: PaymentStatus.paid,
          transactionStatus: TransactionStatus.completed,
          paidAt: new Date(),
        },
      });

      for (const item of payment.transaction.items) {
        if (!item.productId) {
          continue;
        }

        const updated = await tx.product.updateMany({
          where: {
            id: item.productId,
            storeId: context.storeId,
            stock: {
              gte: item.qty,
            },
          },
          data: {
            stock: {
              decrement: item.qty,
            },
          },
        });

        if (updated.count !== 1) {
          throw new Error(`Stok "${item.productName}" tidak cukup.`);
        }

        const productAfterUpdate = await tx.product.findUnique({
          where: {
            id: item.productId,
          },
          select: {
            stock: true,
          },
        });
        const stockAfter = productAfterUpdate?.stock ?? 0;

        await tx.stockMovement.create({
          data: {
            storeId: context.storeId,
            productId: item.productId,
            userId: context.userId,
            type: StockMovementType.sale,
            qty: item.qty,
            stockBefore: stockAfter + item.qty,
            stockAfter,
            note: `Approve transfer ${payment.transaction.invoiceNumber}`,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          storeId: context.storeId,
          userId: context.userId,
          action: "payment.manual.approved",
          entity: "payment",
          entityId: payment.id,
          metadata: {
            invoiceNumber: payment.transaction.invoiceNumber,
            amount: payment.amount.toString(),
          },
        },
      });

      await createNotificationWithClient(tx, {
        storeId: context.storeId,
        userId: payment.transaction.cashierId,
        type: "payment.manual.approved",
        title: "Transfer manual disetujui",
        message: `Invoice ${payment.transaction.invoiceNumber} sudah di-approve.`,
      });
    });

    revalidatePath("/payments");
    revalidatePath(`/payments/${payment.id}`);
    revalidatePath("/transactions");
    revalidatePath(`/transactions/${payment.transactionId}`);
    revalidatePath("/stocks");
    revalidatePath("/products");
    revalidatePath("/dashboard");
    revalidatePath("/", "layout");
    await bumpStoreRealtimeVersion(context.storeId, [
      "payments",
      "transactions",
      "products",
      "stocks",
      "dashboard",
    ]);
    await bumpUserNotificationVersion(context.storeId, payment.transaction.cashierId);

    await Promise.all(
      payment.transaction.items
        .map((item) => item.productId)
        .filter((productId): productId is string => Boolean(productId))
        .map((productId) =>
          notifyLowStockOnce({
            storeId: context.storeId,
            productId,
          }),
        ),
    );

    return {
      success: true,
      message: "Pembayaran berhasil di-approve.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Pembayaran gagal di-approve.",
    };
  }
}

export async function rejectManualPaymentAction(formData: FormData): Promise<PaymentActionState> {
  try {
    const context = await getUserContext("payment.manual.reject");

    if ("error" in context) {
      return { success: false, message: context.error };
    }

    const parsedInput = rejectPaymentSchema.safeParse({
      paymentId: getFormString(formData, "paymentId"),
      reason: getFormString(formData, "reason"),
    });

    if (!parsedInput.success) {
      return {
        success: false,
        message: parsedInput.error.issues[0]?.message ?? "Data reject tidak valid",
      };
    }

    const payment = await getManualPayment(parsedInput.data.paymentId, context.storeId);

    if (!payment) {
      return {
        success: false,
        message: "Pembayaran tidak ditemukan.",
      };
    }

    if (payment.status !== PaymentStatus.pending) {
      return {
        success: false,
        message: "Pembayaran sudah diproses.",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: PaymentStatus.rejected,
          rejectedReason: parsedInput.data.reason,
        },
      });

      await tx.transaction.update({
        where: {
          id: payment.transactionId,
        },
        data: {
          paymentStatus: PaymentStatus.rejected,
          transactionStatus: TransactionStatus.cancelled,
        },
      });

      await tx.auditLog.create({
        data: {
          storeId: context.storeId,
          userId: context.userId,
          action: "payment.manual.rejected",
          entity: "payment",
          entityId: payment.id,
          metadata: {
            invoiceNumber: payment.transaction.invoiceNumber,
            reason: parsedInput.data.reason,
          },
        },
      });

      await createNotificationWithClient(tx, {
        storeId: context.storeId,
        userId: payment.transaction.cashierId,
        type: "payment.manual.rejected",
        title: "Transfer manual ditolak",
        message: `Invoice ${payment.transaction.invoiceNumber} ditolak: ${parsedInput.data.reason}`,
      });
    });

    revalidatePath("/payments");
    revalidatePath(`/payments/${payment.id}`);
    revalidatePath("/transactions");
    revalidatePath(`/transactions/${payment.transactionId}`);
    revalidatePath("/dashboard");
    revalidatePath("/", "layout");
    await bumpStoreRealtimeVersion(context.storeId, [
      "payments",
      "transactions",
      "dashboard",
    ]);
    await bumpUserNotificationVersion(context.storeId, payment.transaction.cashierId);

    return {
      success: true,
      message: "Pembayaran berhasil di-reject.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Pembayaran gagal di-reject.",
    };
  }
}
