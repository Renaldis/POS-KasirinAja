"use server";

import { hashPassword } from "@better-auth/utils/password";
import { Prisma, RoleSlug, UserStatus } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import {
  createUserSchema,
  deactivateUserSchema,
  updateUserSchema,
} from "@/app/(dashboard)/users/_schemas/user-schema";
import type { UserActionState } from "@/app/(dashboard)/users/_types/user";
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
      role: {
        select: {
          slug: true,
        },
      },
    },
  });

  if (!user?.storeId) {
    return {
      error: "Toko belum dibuat. Selesaikan setup toko terlebih dahulu.",
    };
  }

  await requirePermission(user.id, "user.manage");

  return {
    userId: user.id,
    storeId: user.storeId,
    isSuperAdmin: user.role?.slug === RoleSlug.super_admin,
  };
}

function getFormString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

function getUserFormValues(formData: FormData) {
  return {
    name: getFormString(formData, "name"),
    email: getFormString(formData, "email"),
    roleId: getFormString(formData, "roleId"),
    status: getFormString(formData, "status"),
    password: getFormString(formData, "password"),
  };
}

async function validateRole(storeId: string, roleId: string, isSuperAdmin: boolean) {
  const role = await prisma.role.findFirst({
    where: {
      id: roleId,
      OR: isSuperAdmin
        ? [{ storeId }, { storeId: null, slug: RoleSlug.super_admin }]
        : [{ storeId }],
    },
    select: {
      id: true,
      name: true,
    },
  });

  return role;
}

function userErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "Email sudah digunakan.";
  }

  return error instanceof Error ? error.message : fallback;
}

export async function createUserAction(formData: FormData): Promise<UserActionState> {
  try {
    const context = await getActionContext();

    if ("error" in context) {
      return { success: false, message: context.error };
    }

    const parsedInput = createUserSchema.safeParse(getUserFormValues(formData));

    if (!parsedInput.success) {
      return {
        success: false,
        message: parsedInput.error.issues[0]?.message ?? "Data user tidak valid",
      };
    }

    const input = parsedInput.data;
    const role = await validateRole(context.storeId, input.roleId, context.isSuperAdmin);

    if (!role) {
      return {
        success: false,
        message: "Role tidak ditemukan.",
      };
    }

    const passwordHash = await hashPassword(input.password);

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          storeId: context.storeId,
          roleId: role.id,
          name: input.name,
          email: input.email,
          emailVerified: true,
          passwordHash,
          status: input.status,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      await tx.account.create({
        data: {
          providerId: "credential",
          accountId: user.id,
          userId: user.id,
          password: passwordHash,
        },
      });

      await tx.auditLog.create({
        data: {
          storeId: context.storeId,
          userId: context.userId,
          action: "user.created",
          entity: "user",
          entityId: user.id,
          metadata: {
            name: user.name,
            email: user.email,
            roleName: role.name,
            status: input.status,
          },
        },
      });
    });

    revalidatePath("/users");

    return {
      success: true,
      message: "User berhasil dibuat.",
    };
  } catch (error) {
    return {
      success: false,
      message: userErrorMessage(error, "User gagal dibuat."),
    };
  }
}

export async function updateUserAction(formData: FormData): Promise<UserActionState> {
  try {
    const context = await getActionContext();

    if ("error" in context) {
      return { success: false, message: context.error };
    }

    const parsedInput = updateUserSchema.safeParse({
      id: getFormString(formData, "id"),
      ...getUserFormValues(formData),
    });

    if (!parsedInput.success) {
      return {
        success: false,
        message: parsedInput.error.issues[0]?.message ?? "Data user tidak valid",
      };
    }

    const input = parsedInput.data;

    if (input.id === context.userId && input.status === UserStatus.inactive) {
      return {
        success: false,
        message: "Kamu tidak bisa menonaktifkan akun sendiri.",
      };
    }

    const [existingUser, role] = await Promise.all([
      prisma.user.findFirst({
        where: {
          id: input.id,
          storeId: context.storeId,
        },
        select: {
          id: true,
          email: true,
        },
      }),
      validateRole(context.storeId, input.roleId, context.isSuperAdmin),
    ]);

    if (!existingUser) {
      return {
        success: false,
        message: "User tidak ditemukan.",
      };
    }

    if (!role) {
      return {
        success: false,
        message: "Role tidak ditemukan.",
      };
    }

    const passwordHash = input.password ? await hashPassword(input.password) : undefined;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: existingUser.id,
        },
        data: {
          roleId: role.id,
          name: input.name,
          email: input.email,
          status: input.status,
          ...(passwordHash ? { passwordHash } : {}),
        },
      });

      if (passwordHash) {
        const updatedAccounts = await tx.account.updateMany({
          where: {
            providerId: "credential",
            accountId: existingUser.id,
            userId: existingUser.id,
          },
          data: {
            password: passwordHash,
          },
        });

        if (updatedAccounts.count === 0) {
          await tx.account.create({
            data: {
              providerId: "credential",
              accountId: existingUser.id,
              userId: existingUser.id,
              password: passwordHash,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          storeId: context.storeId,
          userId: context.userId,
          action: "user.updated",
          entity: "user",
          entityId: existingUser.id,
          metadata: {
            name: input.name,
            email: input.email,
            roleName: role.name,
            status: input.status,
            passwordChanged: Boolean(passwordHash),
          },
        },
      });
    });

    revalidatePath("/users");
    revalidatePath(`/users/${existingUser.id}/edit`);

    return {
      success: true,
      message: "User berhasil diperbarui.",
    };
  } catch (error) {
    return {
      success: false,
      message: userErrorMessage(error, "User gagal diperbarui."),
    };
  }
}

export async function deactivateUserAction(formData: FormData): Promise<UserActionState> {
  try {
    const context = await getActionContext();

    if ("error" in context) {
      return { success: false, message: context.error };
    }

    const parsedInput = deactivateUserSchema.safeParse({
      id: getFormString(formData, "id"),
    });

    if (!parsedInput.success) {
      return {
        success: false,
        message: parsedInput.error.issues[0]?.message ?? "User tidak valid",
      };
    }

    if (parsedInput.data.id === context.userId) {
      return {
        success: false,
        message: "Kamu tidak bisa menonaktifkan akun sendiri.",
      };
    }

    const user = await prisma.user.findFirst({
      where: {
        id: parsedInput.data.id,
        storeId: context.storeId,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      return {
        success: false,
        message: "User tidak ditemukan.",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          status: UserStatus.inactive,
        },
      });

      await tx.auditLog.create({
        data: {
          storeId: context.storeId,
          userId: context.userId,
          action: "user.deactivated",
          entity: "user",
          entityId: user.id,
          metadata: {
            name: user.name,
            email: user.email,
          },
        },
      });
    });

    revalidatePath("/users");

    return {
      success: true,
      message: "User berhasil dinonaktifkan.",
    };
  } catch (error) {
    return {
      success: false,
      message: userErrorMessage(error, "User gagal dinonaktifkan."),
    };
  }
}
