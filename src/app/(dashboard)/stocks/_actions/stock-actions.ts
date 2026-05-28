"use server";

import { revalidatePath } from "next/cache";
import { StockMovementType } from "@/generated/prisma/client";
import { stockMovementSchema } from "@/app/(dashboard)/stocks/_schemas/stock-schema";
import type { StockActionState } from "@/app/(dashboard)/stocks/_types/stock";
import { requirePermission } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/server";
import { notifyLowStockOnce, resolveLowStockNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { bumpStoreRealtimeVersion } from "@/lib/realtime/store-events";

async function getActionContext(type: StockMovementType) {
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

  await requirePermission(
    user.id,
    type === StockMovementType.adjustment
      ? "stock.adjustment.create"
      : "stock.movement.create",
  );

  return {
    userId: user.id,
    storeId: user.storeId,
  };
}

function getFormString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

export async function createStockMovementAction(formData: FormData): Promise<StockActionState> {
  try {
    const parsedInput = stockMovementSchema.safeParse({
      productId: getFormString(formData, "productId"),
      type: getFormString(formData, "type"),
      qty: getFormString(formData, "qty"),
      stockAfter: getFormString(formData, "stockAfter"),
      note: getFormString(formData, "note"),
    });

    if (!parsedInput.success) {
      return {
        success: false,
        message: parsedInput.error.issues[0]?.message ?? "Data stok tidak valid",
      };
    }

    const input = parsedInput.data;
    const context = await getActionContext(input.type);

    if ("error" in context) {
      return { success: false, message: context.error };
    }

    const product = await prisma.product.findFirst({
      where: {
        id: input.productId,
        storeId: context.storeId,
      },
      select: {
        id: true,
        name: true,
        stock: true,
        minimumStock: true,
      },
    });

    if (!product) {
      return {
        success: false,
        message: "Produk tidak ditemukan.",
      };
    }

    const stockBefore = product.stock;
    const stockAfter =
      input.type === StockMovementType.stock_in
        ? stockBefore + (input.qty ?? 0)
        : input.type === StockMovementType.stock_out
          ? stockBefore - (input.qty ?? 0)
          : input.stockAfter;

    if (stockAfter === undefined) {
      return {
        success: false,
        message: "Stok akhir wajib diisi untuk adjustment.",
      };
    }

    if (stockAfter < 0) {
      return {
        success: false,
        message: "Stok tidak boleh kurang dari 0.",
      };
    }

    const movementQty =
      input.type === StockMovementType.adjustment ? stockAfter - stockBefore : (input.qty ?? 0);

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: {
          id: product.id,
        },
        data: {
          stock: stockAfter,
        },
      });

      await tx.stockMovement.create({
        data: {
          storeId: context.storeId,
          productId: product.id,
          userId: context.userId,
          type: input.type,
          qty: movementQty,
          stockBefore,
          stockAfter,
          note: input.note || null,
        },
      });

      await tx.auditLog.create({
        data: {
          storeId: context.storeId,
          userId: context.userId,
          action: "stock.movement.created",
          entity: "product",
          entityId: product.id,
          metadata: {
            productName: product.name,
            type: input.type,
            qty: movementQty,
            stockBefore,
            stockAfter,
          },
        },
      });
    });

    revalidatePath("/stocks");
    revalidatePath("/products");
    revalidatePath("/pos");
    revalidatePath("/", "layout");
    await bumpStoreRealtimeVersion(context.storeId, ["stocks", "products", "pos"]);

    if (stockAfter <= product.minimumStock) {
      await notifyLowStockOnce({
        storeId: context.storeId,
        productId: product.id,
      });
    } else {
      await resolveLowStockNotification({
        storeId: context.storeId,
        productId: product.id,
      });
    }

    return {
      success: true,
      message: "Mutasi stok berhasil disimpan.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Mutasi stok gagal disimpan.",
    };
  }
}
