import Link from "next/link";
import { FolderTree, Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { ProductFilters } from "@/app/(dashboard)/products/_components/product-filters";
import { ProductList } from "@/app/(dashboard)/products/_components/product-list";
import {
  toCategoryOption,
  toProductListItem,
} from "@/app/(dashboard)/products/_services/product-mappers";
import { Button } from "@/components/ui/button";
import {
  ListPagination,
} from "@/components/shared/list-pagination";
import { PageShell } from "@/components/shared/page-shell";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentUserWithAccess } from "@/lib/auth/server";
import { normalizePage, normalizePageSize } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

type ProductsPageProps = {
  searchParams: Promise<{
    q?: string;
    categoryId?: string;
    status?: string;
    stock?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const user = await getCurrentUserWithAccess();
  const filters = await searchParams;

  if (!user) {
    redirect("/auth/login");
  }

  if (!user.storeId) {
    redirect("/auth/register");
  }

  const search = filters.q?.trim() ?? "";
  const categoryId = filters.categoryId?.trim() || undefined;
  const status = filters.status?.trim() || undefined;
  const stock = filters.stock?.trim() || undefined;
  const page = normalizePage(filters.page);
  const pageSize = normalizePageSize(filters.pageSize);
  const skip = (page - 1) * pageSize;

  const productWhere = {
    storeId: user.storeId,
    ...(categoryId ? { categoryId } : {}),
    ...(status === "active" ? { isActive: true } : {}),
    ...(status === "inactive" ? { isActive: false } : {}),
    ...(stock === "low" ? { stock: { lte: prisma.product.fields.minimumStock } } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { sku: { contains: search, mode: "insensitive" as const } },
            { barcode: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [categories, products, totalProducts, canCreateProducts, canUpdateProducts, canDeleteProducts] =
    await Promise.all([
      prisma.category.findMany({
        where: {
          storeId: user.storeId,
        },
        orderBy: {
          name: "asc",
        },
      }),
      prisma.product.findMany({
        where: productWhere,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          category: {
            select: {
              name: true,
            },
          },
        },
        skip,
        take: pageSize,
      }),
      prisma.product.count({
        where: productWhere,
      }),
      hasPermission(user.id, "product.create"),
      hasPermission(user.id, "product.update"),
      hasPermission(user.id, "product.delete"),
    ]);

  const categoryOptions = categories.map(toCategoryOption);
  const productItems = products.map(toProductListItem);

  return (
    <PageShell
      title="Produk"
      description="Kelola katalog produk, SKU, barcode, harga, dan stok."
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Produk" },
      ]}
      actions={
        <>
          <Button asChild variant="outline">
            <Link href="/products/categories">
              <FolderTree className="h-4 w-4" aria-hidden="true" />
              Kategori
            </Link>
          </Button>
          {canCreateProducts ? (
            <Button asChild>
              <Link href="/products/create">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Tambah Produk
              </Link>
            </Button>
          ) : null}
        </>
      }
    >
      <div className="space-y-4">
        <ProductFilters
          categories={categoryOptions}
          categoryId={categoryId}
          search={search}
          status={status}
          stock={stock}
        />
        <ProductList
          canDelete={canDeleteProducts}
          canUpdate={canUpdateProducts}
          products={productItems}
        />
        <ListPagination
          basePath="/products"
          page={page}
          pageSize={pageSize}
          totalItems={totalProducts}
          searchParams={{ q: search, categoryId, status, stock }}
        />
      </div>
    </PageShell>
  );
}
