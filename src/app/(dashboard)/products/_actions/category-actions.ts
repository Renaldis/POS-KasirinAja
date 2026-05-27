"use server";

import { revalidatePath } from "next/cache";
import {
  createCategorySchema,
  deleteCategorySchema,
  updateCategorySchema,
} from "@/app/(dashboard)/products/_schemas/category-schema";
import type { CategoryActionState } from "@/app/(dashboard)/products/_types/category";
import { getCurrentUser } from "@/lib/auth/server";
import { requirePermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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

  await requirePermission(user.id, "category.manage");

  return {
    userId: user.id,
    storeId: user.storeId,
  };
}

function getFormString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

export async function createCategoryAction(formData: FormData): Promise<CategoryActionState> {
  try {
    const context = await getActionContext();

    if ("error" in context) {
      return { success: false, message: context.error };
    }

    const parsedInput = createCategorySchema.safeParse({
      name: getFormString(formData, "name"),
    });

    if (!parsedInput.success) {
      return {
        success: false,
        message: parsedInput.error.issues[0]?.message ?? "Data kategori tidak valid",
      };
    }

    const slug = slugify(parsedInput.data.name);
    const existingCategory = await prisma.category.findFirst({
      where: {
        storeId: context.storeId,
        slug,
      },
      select: {
        id: true,
      },
    });

    if (existingCategory) {
      return {
        success: false,
        message: "Kategori dengan nama tersebut sudah ada.",
      };
    }

    const category = await prisma.category.create({
      data: {
        storeId: context.storeId,
        name: parsedInput.data.name,
        slug,
      },
      select: {
        id: true,
        name: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        storeId: context.storeId,
        userId: context.userId,
        action: "category.created",
        entity: "category",
        entityId: category.id,
        metadata: {
          name: category.name,
        },
      },
    });

    revalidatePath("/products");

    return {
      success: true,
      message: "Kategori berhasil dibuat.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Kategori gagal dibuat.",
    };
  }
}

export async function updateCategoryAction(formData: FormData): Promise<CategoryActionState> {
  try {
    const context = await getActionContext();

    if ("error" in context) {
      return { success: false, message: context.error };
    }

    const parsedInput = updateCategorySchema.safeParse({
      id: getFormString(formData, "id"),
      name: getFormString(formData, "name"),
    });

    if (!parsedInput.success) {
      return {
        success: false,
        message: parsedInput.error.issues[0]?.message ?? "Data kategori tidak valid",
      };
    }

    const category = await prisma.category.findFirst({
      where: {
        id: parsedInput.data.id,
        storeId: context.storeId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!category) {
      return {
        success: false,
        message: "Kategori tidak ditemukan.",
      };
    }

    const slug = slugify(parsedInput.data.name);
    const duplicateCategory = await prisma.category.findFirst({
      where: {
        storeId: context.storeId,
        slug,
        NOT: {
          id: parsedInput.data.id,
        },
      },
      select: {
        id: true,
      },
    });

    if (duplicateCategory) {
      return {
        success: false,
        message: "Kategori dengan nama tersebut sudah ada.",
      };
    }

    await prisma.category.update({
      where: {
        id: parsedInput.data.id,
      },
      data: {
        name: parsedInput.data.name,
        slug,
      },
    });

    await prisma.auditLog.create({
      data: {
        storeId: context.storeId,
        userId: context.userId,
        action: "category.updated",
        entity: "category",
        entityId: parsedInput.data.id,
        metadata: {
          previousName: category.name,
          name: parsedInput.data.name,
        },
      },
    });

    revalidatePath("/products");

    return {
      success: true,
      message: "Kategori berhasil diperbarui.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Kategori gagal diperbarui.",
    };
  }
}

export async function deleteCategoryAction(formData: FormData): Promise<CategoryActionState> {
  try {
    const context = await getActionContext();

    if ("error" in context) {
      return { success: false, message: context.error };
    }

    const parsedInput = deleteCategorySchema.safeParse({
      id: getFormString(formData, "id"),
    });

    if (!parsedInput.success) {
      return {
        success: false,
        message: parsedInput.error.issues[0]?.message ?? "Kategori tidak valid",
      };
    }

    const category = await prisma.category.findFirst({
      where: {
        id: parsedInput.data.id,
        storeId: context.storeId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!category) {
      return {
        success: false,
        message: "Kategori tidak ditemukan.",
      };
    }

    await prisma.category.delete({
      where: {
        id: category.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        storeId: context.storeId,
        userId: context.userId,
        action: "category.deleted",
        entity: "category",
        entityId: category.id,
        metadata: {
          name: category.name,
        },
      },
    });

    revalidatePath("/products");

    return {
      success: true,
      message: "Kategori berhasil dihapus.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Kategori gagal dihapus.",
    };
  }
}
