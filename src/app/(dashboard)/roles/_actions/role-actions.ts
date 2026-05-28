"use server";

import { Prisma, RoleSlug } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import {
  createRoleSchema,
  deleteRoleSchema,
  updateRoleSchema,
} from "@/app/(dashboard)/roles/_schemas/role-schema";
import type { RoleActionState } from "@/app/(dashboard)/roles/_types/role";
import { globalPermissionKeys } from "@/constants/permissions";
import { requirePermission } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/server";
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

  await requirePermission(user.id, "role.manage");

  return {
    userId: user.id,
    storeId: user.storeId,
  };
}

function getFormString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

function getPermissionIds(formData: FormData) {
  return formData
    .getAll("permissionIds")
    .map((value) => String(value))
    .filter(Boolean);
}

function roleErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "Nama role sudah digunakan di toko ini.";
  }

  return error instanceof Error ? error.message : fallback;
}

async function validatePermissionIds(permissionIds: string[]) {
  const permissions = await prisma.permission.findMany({
    where: {
      id: {
        in: permissionIds,
      },
      key: {
        notIn: [...globalPermissionKeys],
      },
    },
    select: {
      id: true,
      key: true,
    },
  });

  return permissions;
}

async function findRoleNameConflict(storeId: string, name: string, ignoredRoleId?: string) {
  return prisma.role.findFirst({
    where: {
      ...(ignoredRoleId ? { id: { not: ignoredRoleId } } : {}),
      name: {
        equals: name,
        mode: "insensitive",
      },
      OR: [{ storeId }, { storeId: null, slug: RoleSlug.super_admin }],
    },
    select: {
      id: true,
    },
  });
}

export async function createRoleAction(formData: FormData): Promise<RoleActionState> {
  try {
    const context = await getActionContext();

    if ("error" in context) {
      return { success: false, message: context.error };
    }

    const parsedInput = createRoleSchema.safeParse({
      name: getFormString(formData, "name"),
      description: getFormString(formData, "description"),
      permissionIds: getPermissionIds(formData),
    });

    if (!parsedInput.success) {
      return {
        success: false,
        message: parsedInput.error.issues[0]?.message ?? "Data role tidak valid",
      };
    }

    const input = parsedInput.data;
    const existingRole = await findRoleNameConflict(context.storeId, input.name);

    if (existingRole) {
      return {
        success: false,
        message: "Nama role sudah digunakan.",
      };
    }

    const permissions = await validatePermissionIds(input.permissionIds);

    if (permissions.length !== input.permissionIds.length) {
      return {
        success: false,
        message: "Sebagian permission tidak ditemukan.",
      };
    }

    await prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          storeId: context.storeId,
          name: input.name,
          slug: RoleSlug.custom,
          description: input.description,
          isSystem: false,
        },
        select: {
          id: true,
          name: true,
        },
      });

      await tx.rolePermission.createMany({
        data: permissions.map((permission) => ({
          roleId: role.id,
          permissionId: permission.id,
        })),
        skipDuplicates: true,
      });

      await tx.auditLog.create({
        data: {
          storeId: context.storeId,
          userId: context.userId,
          action: "role.created",
          entity: "role",
          entityId: role.id,
          metadata: {
            name: role.name,
            permissionKeys: permissions.map((permission) => permission.key),
          },
        },
      });
    });

    revalidatePath("/roles");
    revalidatePath("/users");

    return {
      success: true,
      message: "Role berhasil dibuat.",
    };
  } catch (error) {
    return {
      success: false,
      message: roleErrorMessage(error, "Role gagal dibuat."),
    };
  }
}

export async function updateRoleAction(formData: FormData): Promise<RoleActionState> {
  try {
    const context = await getActionContext();

    if ("error" in context) {
      return { success: false, message: context.error };
    }

    const parsedInput = updateRoleSchema.safeParse({
      id: getFormString(formData, "id"),
      name: getFormString(formData, "name"),
      description: getFormString(formData, "description"),
      permissionIds: getPermissionIds(formData),
    });

    if (!parsedInput.success) {
      return {
        success: false,
        message: parsedInput.error.issues[0]?.message ?? "Data role tidak valid",
      };
    }

    const input = parsedInput.data;
    const role = await prisma.role.findFirst({
      where: {
        id: input.id,
        storeId: context.storeId,
      },
      select: {
        id: true,
        isSystem: true,
        storeId: true,
      },
    });

    if (!role) {
      return {
        success: false,
        message: "Role tidak ditemukan.",
      };
    }

    const existingRole = await findRoleNameConflict(context.storeId, input.name, role.id);

    if (existingRole) {
      return {
        success: false,
        message: "Nama role sudah digunakan.",
      };
    }

    const permissions = await validatePermissionIds(input.permissionIds);

    if (permissions.length !== input.permissionIds.length) {
      return {
        success: false,
        message: "Sebagian permission tidak ditemukan.",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.role.update({
        where: {
          id: role.id,
        },
        data: {
          name: input.name,
          description: input.description,
        },
      });

      await tx.rolePermission.deleteMany({
        where: {
          roleId: role.id,
        },
      });

      await tx.rolePermission.createMany({
        data: permissions.map((permission) => ({
          roleId: role.id,
          permissionId: permission.id,
        })),
        skipDuplicates: true,
      });

      await tx.auditLog.create({
        data: {
          storeId: context.storeId,
          userId: context.userId,
          action: "role.updated",
          entity: "role",
          entityId: role.id,
          metadata: {
            name: input.name,
            permissionKeys: permissions.map((permission) => permission.key),
          },
        },
      });
    });

    revalidatePath("/roles");
    revalidatePath(`/roles/${role.id}/edit`);
    revalidatePath("/users");

    return {
      success: true,
      message: "Role berhasil diperbarui.",
    };
  } catch (error) {
    return {
      success: false,
      message: roleErrorMessage(error, "Role gagal diperbarui."),
    };
  }
}

export async function deleteRoleAction(formData: FormData): Promise<RoleActionState> {
  try {
    const context = await getActionContext();

    if ("error" in context) {
      return { success: false, message: context.error };
    }

    const parsedInput = deleteRoleSchema.safeParse({
      id: getFormString(formData, "id"),
    });

    if (!parsedInput.success) {
      return {
        success: false,
        message: parsedInput.error.issues[0]?.message ?? "Role tidak valid",
      };
    }

    const role = await prisma.role.findFirst({
      where: {
        id: parsedInput.data.id,
        storeId: context.storeId,
      },
      select: {
        id: true,
        name: true,
        isSystem: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!role) {
      return {
        success: false,
        message: "Role tidak ditemukan.",
      };
    }

    if (role.isSystem) {
      return {
        success: false,
        message: "Role system tidak bisa dihapus.",
      };
    }

    if (role._count.users > 0) {
      return {
        success: false,
        message: "Role masih digunakan user. Pindahkan user ke role lain dulu.",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.role.delete({
        where: {
          id: role.id,
        },
      });

      await tx.auditLog.create({
        data: {
          storeId: context.storeId,
          userId: context.userId,
          action: "role.deleted",
          entity: "role",
          entityId: role.id,
          metadata: {
            name: role.name,
          },
        },
      });
    });

    revalidatePath("/roles");
    revalidatePath("/users");

    return {
      success: true,
      message: "Role berhasil dihapus.",
    };
  } catch (error) {
    return {
      success: false,
      message: roleErrorMessage(error, "Role gagal dihapus."),
    };
  }
}
