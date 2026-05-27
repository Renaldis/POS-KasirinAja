import Link from "next/link";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { CategoryList } from "@/app/(dashboard)/products/_components/category-list";
import type { CategoryListItem } from "@/app/(dashboard)/products/_types/category";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/shared/page-shell";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentUserWithAccess } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

export default async function CategoriesPage() {
  const user = await getCurrentUserWithAccess();

  if (!user) {
    redirect("/auth/login");
  }

  if (!user.storeId) {
    redirect("/auth/register");
  }

  const [categories, canManageCategories] = await Promise.all([
    prisma.category.findMany({
      where: {
        storeId: user.storeId,
      },
      orderBy: {
        name: "asc",
      },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    }),
    hasPermission(user.id, "category.manage"),
  ]);

  const categoryItems: CategoryListItem[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    productCount: category._count.products,
    createdAt: category.createdAt.toISOString(),
  }));

  return (
    <PageShell
      title="Kategori Produk"
      description="Kelola kategori katalog produk toko."
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Produk", href: "/products" },
        { label: "Kategori" },
      ]}
      actions={
        canManageCategories ? (
          <Button asChild>
            <Link href="/products/categories/create">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Tambah Kategori
            </Link>
          </Button>
        ) : null
      }
    >
      <CategoryList canManage={canManageCategories} categories={categoryItems} />
    </PageShell>
  );
}
