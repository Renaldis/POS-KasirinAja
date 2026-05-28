import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, RoleSlug } from "../src/generated/prisma/client";
import {
  defaultRolePermissions,
  globalPermissionKeys,
  permissions,
} from "../src/constants/permissions";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  await prisma.$transaction(async (tx) => {
    for (const permission of permissions) {
      await tx.permission.upsert({
        where: { key: permission.key },
        update: {
          name: permission.name,
          module: permission.module,
        },
        create: {
          key: permission.key,
          name: permission.name,
          module: permission.module,
        },
      });
    }

    const globalRoles = [
      { name: "Super Admin", slug: RoleSlug.super_admin },
    ];

    for (const role of globalRoles) {
      const existingRole = await tx.role.findFirst({
        where: {
          storeId: null,
          name: role.name,
        },
      });

      const savedRole = existingRole
        ? await tx.role.update({
            where: { id: existingRole.id },
            data: {
              slug: role.slug,
              isSystem: true,
            },
          })
        : await tx.role.create({
            data: {
              name: role.name,
              slug: role.slug,
              isSystem: true,
            },
          });

      const permissionKeys = defaultRolePermissions[role.slug];
      const savedPermissions = await tx.permission.findMany({
        where: {
          key: {
            in: [...permissionKeys],
          },
        },
      });

      await tx.rolePermission.deleteMany({
        where: {
          roleId: savedRole.id,
        },
      });

      await tx.rolePermission.createMany({
        data: savedPermissions.map((permission) => ({
          roleId: savedRole.id,
          permissionId: permission.id,
        })),
        skipDuplicates: true,
      });
    }

    const stores = await tx.store.findMany({
      select: {
        id: true,
      },
    });

    const storeRoles = [
      {
        name: "Admin Warung",
        slug: RoleSlug.admin,
        description: "Role admin default untuk pengelola toko.",
      },
      {
        name: "Kasir",
        slug: RoleSlug.cashier,
        description: "Role kasir default untuk operasional POS.",
      },
    ];

    for (const store of stores) {
      for (const role of storeRoles) {
        const existingRole = await tx.role.findFirst({
          where: {
            storeId: store.id,
            name: role.name,
          },
        });

        const savedRole = existingRole
          ? await tx.role.update({
              where: { id: existingRole.id },
              data: {
                slug: role.slug,
                description: role.description,
                isSystem: true,
              },
            })
          : await tx.role.create({
              data: {
                storeId: store.id,
                name: role.name,
                slug: role.slug,
                description: role.description,
                isSystem: true,
              },
            });

        const permissionKeys = defaultRolePermissions[role.slug];
        const savedPermissions = await tx.permission.findMany({
          where: {
            key: {
              in: [...permissionKeys],
            },
          },
        });

        await tx.rolePermission.deleteMany({
          where: {
            roleId: savedRole.id,
          },
        });

        await tx.rolePermission.createMany({
          data: savedPermissions.map((permission) => ({
            roleId: savedRole.id,
            permissionId: permission.id,
          })),
          skipDuplicates: true,
        });

        await tx.user.updateMany({
          where: {
            storeId: store.id,
            role: {
              storeId: null,
              slug: role.slug,
            },
          },
          data: {
            roleId: savedRole.id,
          },
        });
      }
    }

    await tx.rolePermission.deleteMany({
      where: {
        role: {
          storeId: {
            not: null,
          },
        },
        permission: {
          key: {
            in: [...globalPermissionKeys],
          },
        },
      },
    });

    await tx.role.deleteMany({
      where: {
        storeId: null,
        slug: {
          in: [RoleSlug.admin, RoleSlug.cashier],
        },
      },
    });
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
