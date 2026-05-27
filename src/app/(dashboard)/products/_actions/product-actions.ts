"use server";

import { revalidatePath } from "next/cache";
import { StockMovementType } from "@/generated/prisma/client";
import {
  createProductSchema,
  deactivateProductSchema,
  updateProductSchema,
} from "@/app/(dashboard)/products/_schemas/product-schema";
import type { ProductActionState } from "@/app/(dashboard)/products/_types/product";
import { getCurrentUser } from "@/lib/auth/server";
import { requirePermission } from "@/lib/auth/permissions";
import { getOptionalImageFile, uploadImage } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";
import type { PermissionKey } from "@/constants/permissions";

async function getActionContext(permission: PermissionKey) {
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

function getFormBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function getProductFormValues(formData: FormData) {
  return {
    name: getFormString(formData, "name"),
    sku: getFormString(formData, "sku"),
    barcode: getFormString(formData, "barcode"),
    categoryId: getFormString(formData, "categoryId"),
    unit: getFormString(formData, "unit") || "pcs",
    costPrice: getFormString(formData, "costPrice"),
    sellingPrice: getFormString(formData, "sellingPrice"),
    stock: getFormString(formData, "stock"),
    minimumStock: getFormString(formData, "minimumStock"),
    isActive: getFormBoolean(formData, "isActive"),
  };
}

async function validateCategory(storeId: string, categoryId?: string) {
  if (!categoryId) {
    return true;
  }

  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      storeId,
    },
    select: {
      id: true,
    },
  });

  return Boolean(category);
}

export async function createProductAction(formData: FormData): Promise<ProductActionState> {
  try {
    const context = await getActionContext("product.create");

    if ("error" in context) {
      return { success: false, message: context.error };
    }

    const parsedInput = createProductSchema.safeParse(getProductFormValues(formData));

    if (!parsedInput.success) {
      return {
        success: false,
        message: parsedInput.error.issues[0]?.message ?? "Data produk tidak valid",
      };
    }

    const input = parsedInput.data;
    const categoryValid = await validateCategory(context.storeId, input.categoryId);

    if (!categoryValid) {
      return {
        success: false,
        message: "Kategori tidak ditemukan.",
      };
    }

    const existingProduct = await prisma.product.findUnique({
      where: {
        storeId_sku: {
          storeId: context.storeId,
          sku: input.sku,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingProduct) {
      return {
        success: false,
        message: "SKU sudah digunakan di toko ini.",
      };
    }

    const imageFile = getOptionalImageFile(formData, "image");
    const imageUrl = imageFile
      ? await uploadImage(imageFile, `kasirinaja/${context.storeId}/products`)
      : undefined;

    await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          storeId: context.storeId,
          categoryId: input.categoryId,
          name: input.name,
          sku: input.sku,
          barcode: input.barcode,
          unit: input.unit,
          costPrice: input.costPrice.toFixed(2),
          sellingPrice: input.sellingPrice.toFixed(2),
          stock: input.stock,
          minimumStock: input.minimumStock,
          imageUrl,
          isActive: input.isActive,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (input.stock > 0) {
        await tx.stockMovement.create({
          data: {
            storeId: context.storeId,
            productId: product.id,
            userId: context.userId,
            type: StockMovementType.stock_in,
            qty: input.stock,
            stockBefore: 0,
            stockAfter: input.stock,
            note: "Stok awal produk",
          },
        });
      }

      await tx.auditLog.create({
        data: {
          storeId: context.storeId,
          userId: context.userId,
          action: "product.created",
          entity: "product",
          entityId: product.id,
          metadata: {
            name: product.name,
            sku: input.sku,
            imageUrl,
          },
        },
      });
    });

    revalidatePath("/products");

    return {
      success: true,
      message: "Produk berhasil dibuat.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Produk gagal dibuat.",
    };
  }
}

export async function updateProductAction(formData: FormData): Promise<ProductActionState> {
  try {
    const context = await getActionContext("product.update");

    if ("error" in context) {
      return { success: false, message: context.error };
    }

    const parsedInput = updateProductSchema.safeParse({
      id: getFormString(formData, "id"),
      ...getProductFormValues(formData),
    });

    if (!parsedInput.success) {
      return {
        success: false,
        message: parsedInput.error.issues[0]?.message ?? "Data produk tidak valid",
      };
    }

    const input = parsedInput.data;
    const product = await prisma.product.findFirst({
      where: {
        id: input.id,
        storeId: context.storeId,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
      },
    });

    if (!product) {
      return {
        success: false,
        message: "Produk tidak ditemukan.",
      };
    }

    const categoryValid = await validateCategory(context.storeId, input.categoryId);

    if (!categoryValid) {
      return {
        success: false,
        message: "Kategori tidak ditemukan.",
      };
    }

    const duplicateProduct = await prisma.product.findFirst({
      where: {
        storeId: context.storeId,
        sku: input.sku,
        NOT: {
          id: input.id,
        },
      },
      select: {
        id: true,
      },
    });

    if (duplicateProduct) {
      return {
        success: false,
        message: "SKU sudah digunakan di toko ini.",
      };
    }

    const imageFile = getOptionalImageFile(formData, "image");
    const imageUrl = imageFile
      ? await uploadImage(imageFile, `kasirinaja/${context.storeId}/products`)
      : undefined;

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: {
          id: input.id,
        },
        data: {
          categoryId: input.categoryId,
          name: input.name,
          sku: input.sku,
          barcode: input.barcode,
          unit: input.unit,
          costPrice: input.costPrice.toFixed(2),
          sellingPrice: input.sellingPrice.toFixed(2),
          stock: input.stock,
          minimumStock: input.minimumStock,
          ...(imageUrl ? { imageUrl } : {}),
          isActive: input.isActive,
        },
      });

      if (product.stock !== input.stock) {
        await tx.stockMovement.create({
          data: {
            storeId: context.storeId,
            productId: input.id,
            userId: context.userId,
            type: StockMovementType.adjustment,
            qty: input.stock - product.stock,
            stockBefore: product.stock,
            stockAfter: input.stock,
            note: "Penyesuaian stok dari edit produk",
          },
        });
      }

      await tx.auditLog.create({
        data: {
          storeId: context.storeId,
          userId: context.userId,
          action: "product.updated",
          entity: "product",
          entityId: input.id,
          metadata: {
            previousName: product.name,
            previousSku: product.sku,
            name: input.name,
            sku: input.sku,
            imageUrl,
          },
        },
      });
    });

    revalidatePath("/products");

    return {
      success: true,
      message: "Produk berhasil diperbarui.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Produk gagal diperbarui.",
    };
  }
}

export async function deactivateProductAction(formData: FormData): Promise<ProductActionState> {
  try {
    const context = await getActionContext("product.delete");

    if ("error" in context) {
      return { success: false, message: context.error };
    }

    const parsedInput = deactivateProductSchema.safeParse({
      id: getFormString(formData, "id"),
    });

    if (!parsedInput.success) {
      return {
        success: false,
        message: parsedInput.error.issues[0]?.message ?? "Produk tidak valid",
      };
    }

    const product = await prisma.product.findFirst({
      where: {
        id: parsedInput.data.id,
        storeId: context.storeId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!product) {
      return {
        success: false,
        message: "Produk tidak ditemukan.",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: {
          id: product.id,
        },
        data: {
          isActive: false,
        },
      });

      await tx.auditLog.create({
        data: {
          storeId: context.storeId,
          userId: context.userId,
          action: "product.deactivated",
          entity: "product",
          entityId: product.id,
          metadata: {
            name: product.name,
          },
        },
      });
    });

    revalidatePath("/products");

    return {
      success: true,
      message: "Produk berhasil dinonaktifkan.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Produk gagal dinonaktifkan.",
    };
  }
}
