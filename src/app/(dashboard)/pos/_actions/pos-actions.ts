"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import {
  PaymentMethod,
  PaymentStatus,
  ShiftStatus,
  StockMovementType,
  TransactionStatus,
} from "@/generated/prisma/client";
import {
  checkoutCashSchema,
  checkoutManualTransferSchema,
  type CheckoutCashInput,
  type CheckoutManualTransferInput,
} from "@/app/(dashboard)/pos/_schemas/pos-schema";
import type {
  CheckoutCashActionState,
  CheckoutManualTransferActionState,
} from "@/app/(dashboard)/pos/_types/pos";
import { requirePermission } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/server";
import { notifyLowStockOnce, notifyUsersWithPermission } from "@/lib/notifications";
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

  await requirePermission(user.id, "pos.transaction.create");

  const activeShift = await prisma.shift.findFirst({
    where: {
      storeId: user.storeId,
      cashierId: user.id,
      status: ShiftStatus.open,
    },
    select: {
      id: true,
    },
  });

  if (!activeShift) {
    return {
      error: "Buka shift terlebih dahulu sebelum memproses transaksi.",
    };
  }

  return {
    userId: user.id,
    storeId: user.storeId,
    shiftId: activeShift.id,
  };
}

function generateInvoiceNumber() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  const time = now.toISOString().slice(11, 19).replaceAll(":", "");
  const suffix = randomUUID().slice(0, 6).toUpperCase();

  return `INV-${date}-${time}-${suffix}`;
}

export async function checkoutCashAction(
  input: CheckoutCashInput,
): Promise<CheckoutCashActionState> {
  try {
    const context = await getActionContext();

    if ("error" in context) {
      return { success: false, message: context.error };
    }

    const parsedInput = checkoutCashSchema.safeParse(input);

    if (!parsedInput.success) {
      return {
        success: false,
        message: parsedInput.error.issues[0]?.message ?? "Data transaksi tidak valid",
      };
    }

    const mergedItems = new Map<string, number>();

    for (const item of parsedInput.data.items) {
      mergedItems.set(item.productId, (mergedItems.get(item.productId) ?? 0) + item.qty);
    }

    const productIds = Array.from(mergedItems.keys());
    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
        storeId: context.storeId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        sellingPrice: true,
        stock: true,
      },
    });

    if (products.length !== productIds.length) {
      return {
        success: false,
        message: "Sebagian produk tidak ditemukan atau sudah nonaktif.",
      };
    }

    let subtotal = 0;
    const transactionItems = products.map((product) => {
      const qty = mergedItems.get(product.id) ?? 0;
      const unitPrice = Number(product.sellingPrice.toString());

      if (product.stock < qty) {
        throw new Error(`Stok "${product.name}" tidak cukup.`);
      }

      return {
        productId: product.id,
        productName: product.name,
        qty,
        unitPrice,
        subtotal: unitPrice * qty,
      };
    });

    subtotal = transactionItems.reduce((total, item) => total + item.subtotal, 0);

    if (parsedInput.data.receivedCash < subtotal) {
      return {
        success: false,
        message: "Uang diterima kurang dari total transaksi.",
      };
    }

    const invoiceNumber = generateInvoiceNumber();
    const change = parsedInput.data.receivedCash - subtotal;

    const transaction = await prisma.$transaction(async (tx) => {
      const createdTransaction = await tx.transaction.create({
        data: {
          storeId: context.storeId,
          shiftId: context.shiftId,
          cashierId: context.userId,
          invoiceNumber,
          subtotal: subtotal.toFixed(2),
          discountTotal: "0.00",
          taxTotal: "0.00",
          total: subtotal.toFixed(2),
          paymentMethod: PaymentMethod.cash,
          paymentStatus: PaymentStatus.paid,
          transactionStatus: TransactionStatus.completed,
          paidAt: new Date(),
          items: {
            create: transactionItems.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              qty: item.qty,
              unitPrice: item.unitPrice.toFixed(2),
              subtotal: item.subtotal.toFixed(2),
            })),
          },
          payments: {
            create: {
              method: PaymentMethod.cash,
              status: PaymentStatus.paid,
              amount: subtotal.toFixed(2),
              reference: invoiceNumber,
            },
          },
        },
        select: {
          id: true,
        },
      });

      for (const item of transactionItems) {
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
            note: `Penjualan ${invoiceNumber}`,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          storeId: context.storeId,
          userId: context.userId,
          action: "transaction.cash.completed",
          entity: "transaction",
          entityId: createdTransaction.id,
          metadata: {
            invoiceNumber,
            total: subtotal,
            receivedCash: parsedInput.data.receivedCash,
            change,
          },
        },
      });

      return createdTransaction;
    });

    revalidatePath("/pos");
    revalidatePath("/products");
    revalidatePath("/shifts");
    revalidatePath(`/shifts/${context.shiftId}`);
    revalidatePath("/", "layout");
    await bumpStoreRealtimeVersion(context.storeId, [
      "transactions",
      "products",
      "stocks",
      "dashboard",
    ]);

    await Promise.all(
      transactionItems.map((item) =>
        notifyLowStockOnce({
          storeId: context.storeId,
          productId: item.productId,
        }),
      ),
    );

    return {
      success: true,
      message: "Transaksi cash berhasil disimpan.",
      invoiceNumber,
      change: change.toFixed(2),
      transactionId: transaction.id,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Transaksi gagal diproses.",
    };
  }
}

export async function checkoutManualTransferAction(
  input: CheckoutManualTransferInput,
): Promise<CheckoutManualTransferActionState> {
  try {
    const context = await getActionContext();

    if ("error" in context) {
      return { success: false, message: context.error };
    }

    const parsedInput = checkoutManualTransferSchema.safeParse(input);

    if (!parsedInput.success) {
      return {
        success: false,
        message: parsedInput.error.issues[0]?.message ?? "Data transaksi tidak valid",
      };
    }

    const mergedItems = new Map<string, number>();

    for (const item of parsedInput.data.items) {
      mergedItems.set(item.productId, (mergedItems.get(item.productId) ?? 0) + item.qty);
    }

    const productIds = Array.from(mergedItems.keys());
    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
        storeId: context.storeId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        sellingPrice: true,
        stock: true,
      },
    });

    if (products.length !== productIds.length) {
      return {
        success: false,
        message: "Sebagian produk tidak ditemukan atau sudah nonaktif.",
      };
    }

    const transactionItems = products.map((product) => {
      const qty = mergedItems.get(product.id) ?? 0;
      const unitPrice = Number(product.sellingPrice.toString());

      if (product.stock < qty) {
        throw new Error(`Stok "${product.name}" tidak cukup.`);
      }

      return {
        productId: product.id,
        productName: product.name,
        qty,
        unitPrice,
        subtotal: unitPrice * qty,
      };
    });
    const subtotal = transactionItems.reduce((total, item) => total + item.subtotal, 0);
    const invoiceNumber = generateInvoiceNumber();

    const transaction = await prisma.$transaction(async (tx) => {
      const createdTransaction = await tx.transaction.create({
        data: {
          storeId: context.storeId,
          shiftId: context.shiftId,
          cashierId: context.userId,
          invoiceNumber,
          subtotal: subtotal.toFixed(2),
          discountTotal: "0.00",
          taxTotal: "0.00",
          total: subtotal.toFixed(2),
          paymentMethod: PaymentMethod.manual_transfer,
          paymentStatus: PaymentStatus.pending,
          transactionStatus: TransactionStatus.pending,
          items: {
            create: transactionItems.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              qty: item.qty,
              unitPrice: item.unitPrice.toFixed(2),
              subtotal: item.subtotal.toFixed(2),
            })),
          },
          payments: {
            create: {
              method: PaymentMethod.manual_transfer,
              status: PaymentStatus.pending,
              amount: subtotal.toFixed(2),
              reference: invoiceNumber,
            },
          },
        },
        select: {
          id: true,
          payments: {
            select: {
              id: true,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          storeId: context.storeId,
          userId: context.userId,
          action: "transaction.manual_transfer.pending",
          entity: "transaction",
          entityId: createdTransaction.id,
          metadata: {
            invoiceNumber,
            total: subtotal,
          },
        },
      });

      return createdTransaction;
    });

    revalidatePath("/pos");
    revalidatePath("/payments");
    revalidatePath("/transactions");
    revalidatePath("/dashboard");
    revalidatePath("/", "layout");
    await bumpStoreRealtimeVersion(context.storeId, [
      "payments",
      "transactions",
      "dashboard",
    ]);

    await notifyUsersWithPermission({
      storeId: context.storeId,
      permission: "payment.manual.approve",
      type: "payment.manual.pending",
      title: "Transfer manual menunggu approval",
      message: `Invoice ${invoiceNumber} menunggu verifikasi pembayaran.`,
      excludeUserId: context.userId,
    });

    return {
      success: true,
      message: "Transaksi transfer dibuat sebagai pending.",
      invoiceNumber,
      transactionId: transaction.id,
      paymentId: transaction.payments[0]?.id,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Transaksi transfer gagal diproses.",
    };
  }
}
