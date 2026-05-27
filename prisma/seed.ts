import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, RoleSlug } from "../src/generated/prisma/client";
import { defaultRolePermissions, permissions } from "../src/constants/permissions";

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

    const roles = [
      { name: "Super Admin", slug: RoleSlug.super_admin },
      { name: "Admin Warung", slug: RoleSlug.admin },
      { name: "Kasir", slug: RoleSlug.cashier },
    ];

    for (const role of roles) {
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

      for (const permission of savedPermissions) {
        await tx.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: savedRole.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: savedRole.id,
            permissionId: permission.id,
          },
        });
      }
    }
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
