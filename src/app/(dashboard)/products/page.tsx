import { redirect } from "next/navigation";
import { CategoriesPanel } from "@/app/(dashboard)/products/_components/categories-panel";
import type { CategoryListItem } from "@/app/(dashboard)/products/_types/category";
import { EmptyState } from "@/components/shared/empty-state";
import { PageShell } from "@/components/shared/page-shell";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentUserWithAccess } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

export default async function ProductsPage() {
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
    <PageShell title="Produk" description="Kelola katalog produk, SKU, barcode, harga, dan stok.">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Produk</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              CRUD produk akan dibangun setelah kategori siap.
            </p>
          </div>
          <EmptyState
            title="Produk belum tersedia"
            description="Produk, SKU, barcode, harga, stok, upload foto, search, filter, dan pagination akan masuk pada tahap berikutnya."
            actionLabel="Tambah Produk"
          />
        </section>

        <CategoriesPanel canManage={canManageCategories} categories={categoryItems} />
      </div>
    </PageShell>
  );
}
