import Link from "next/link";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { CategoryList } from "@/app/(dashboard)/products/_components/category-list";
import type { CategoryListItem } from "@/app/(dashboard)/products/_types/category";
import { Button } from "@/components/ui/button";
import {
  ListPagination,
} from "@/components/shared/list-pagination";
import { PageShell } from "@/components/shared/page-shell";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentUserWithAccess } from "@/lib/auth/server";
import { normalizePage, normalizePageSize } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

type CategoriesPageProps = {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
  }>;
};

export default async function CategoriesPage({ searchParams }: CategoriesPageProps) {
  const user = await getCurrentUserWithAccess();
  const filters = await searchParams;

  if (!user) {
    redirect("/auth/login");
  }

  if (!user.storeId) {
    redirect("/auth/register");
  }

  const page = normalizePage(filters.page);
  const pageSize = normalizePageSize(filters.pageSize);
  const skip = (page - 1) * pageSize;
  const categoryWhere = {
    storeId: user.storeId,
  };

  const [categories, totalCategories, canManageCategories] = await Promise.all([
    prisma.category.findMany({
      where: categoryWhere,
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
      skip,
      take: pageSize,
    }),
    prisma.category.count({
      where: categoryWhere,
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
      <div className="space-y-4">
        <CategoryList canManage={canManageCategories} categories={categoryItems} />
        <ListPagination
          basePath="/products/categories"
          page={page}
          pageSize={pageSize}
          totalItems={totalCategories}
        />
      </div>
    </PageShell>
  );
}
