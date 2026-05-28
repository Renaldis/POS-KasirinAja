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

    const defaultStoreRoles = [
      {
        name: "Admin Warung",
        slug: RoleSlug.admin,
        description: "Role admin default untuk pengelola toko.",
        permissionKeys: defaultRolePermissions.admin,
      },
      {
        name: "Kasir",
        slug: RoleSlug.cashier,
        description: "Role kasir default untuk operasional POS.",
        permissionKeys: defaultRolePermissions.cashier,
      },
    ];

    let adminRoleId = "";

    for (const role of defaultStoreRoles) {
      const savedRole = await tx.role.create({
        data: {
          storeId: store.id,
          name: role.name,
          slug: role.slug,
          description: role.description,
          isSystem: true,
        },
      });

      if (role.slug === RoleSlug.admin) {
        adminRoleId = savedRole.id;
      }

      const rolePermissions = await tx.permission.findMany({
        where: {
          key: {
            in: [...role.permissionKeys],
          },
        },
        select: {
          id: true,
        },
      });

      if (rolePermissions.length === 0) {
        throw new Error("Permission default belum tersedia. Jalankan seed database.");
      }

      await tx.rolePermission.createMany({
        data: rolePermissions.map((permission) => ({
          roleId: savedRole.id,
          permissionId: permission.id,
        })),
        skipDuplicates: true,
      });
    }

    await tx.user.update({
      where: { id: existingUser.id },
      data: {
        storeId: store.id,
        roleId: adminRoleId,
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
