"use server";

import { RoleSlug } from "@/generated/prisma/client";
import { defaultRolePermissions } from "@/constants/permissions";
import { registerStoreSchema } from "@/app/auth/_schemas/register-store-schema";
import { getCurrentUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

type SetupInitialStoreState = {
  success: boolean;
  message?: string;
};

export async function setupInitialStoreAction(
  input: unknown,
): Promise<SetupInitialStoreState> {
  const parsedInput = registerStoreSchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      success: false,
      message: parsedInput.error.issues[0]?.message ?? "Data toko tidak valid",
    };
  }

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return {
      success: false,
      message: "Sesi tidak ditemukan. Silakan login ulang.",
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: {
      id: true,
      storeId: true,
    },
  });

  if (!existingUser) {
    return {
      success: false,
      message: "User tidak ditemukan.",
    };
  }

  if (existingUser.storeId) {
    return { success: true };
  }

  await prisma.$transaction(async (tx) => {
    const store = await tx.store.create({
      data: {
        name: parsedInput.data.storeName,
      },
    });

    const adminRole = await tx.role.create({
      data: {
        storeId: store.id,
        name: "Admin Warung",
        slug: RoleSlug.admin,
        description: "Role admin default untuk pengelola toko.",
        isSystem: true,
      },
    });

    const adminPermissions = await tx.permission.findMany({
      where: {
        key: {
          in: [...defaultRolePermissions.admin],
        },
      },
      select: {
        id: true,
      },
    });

    if (adminPermissions.length === 0) {
      throw new Error("Permission default belum tersedia. Jalankan seed database.");
    }

    await tx.rolePermission.createMany({
      data: adminPermissions.map((permission) => ({
        roleId: adminRole.id,
        permissionId: permission.id,
      })),
      skipDuplicates: true,
    });

    await tx.user.update({
      where: { id: existingUser.id },
      data: {
        storeId: store.id,
        roleId: adminRole.id,
      },
    });

    await tx.auditLog.create({
      data: {
        storeId: store.id,
        userId: existingUser.id,
        action: "store.created",
        entity: "store",
        entityId: store.id,
        metadata: {
          storeName: store.name,
        },
      },
    });
  });

  return { success: true };
}
