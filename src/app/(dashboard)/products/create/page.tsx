import { redirect } from "next/navigation";
import { ProductForm } from "@/app/(dashboard)/products/_components/product-form";
import { toCategoryOption } from "@/app/(dashboard)/products/_services/product-mappers";
import { PageShell } from "@/components/shared/page-shell";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentUserWithAccess } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

export default async function CreateProductPage() {
  const user = await getCurrentUserWithAccess();

  if (!user) {
    redirect("/auth/login");
  }

  if (!user.storeId) {
    redirect("/auth/register");
  }

  const [categories, canCreateProducts] = await Promise.all([
    prisma.category.findMany({
      where: {
        storeId: user.storeId,
      },
      orderBy: {
        name: "asc",
      },
    }),
    hasPermission(user.id, "product.create"),
  ]);

  if (!canCreateProducts) {
    redirect("/products");
  }

  return (
    <PageShell
      title="Tambah Produk"
      description="Buat produk baru beserta stok awalnya."
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Produk", href: "/products" },
        { label: "Tambah" },
      ]}
    >
      <ProductForm canCreate={canCreateProducts} categories={categories.map(toCategoryOption)} />
    </PageShell>
  );
}
