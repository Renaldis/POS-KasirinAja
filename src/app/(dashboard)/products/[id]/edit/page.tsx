import { notFound, redirect } from "next/navigation";
import { ProductEditForm } from "@/app/(dashboard)/products/_components/product-edit-form";
import {
  toCategoryOption,
  toProductListItem,
} from "@/app/(dashboard)/products/_services/product-mappers";
import { PageShell } from "@/components/shared/page-shell";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentUserWithAccess } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

type EditProductPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditProductPage({ params }: EditProductPageProps) {
  const user = await getCurrentUserWithAccess();
  const { id } = await params;

  if (!user) {
    redirect("/auth/login");
  }

  if (!user.storeId) {
    redirect("/auth/register");
  }

  const [product, categories, canUpdateProducts] = await Promise.all([
    prisma.product.findFirst({
      where: {
        id,
        storeId: user.storeId,
      },
      include: {
        category: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.category.findMany({
      where: {
        storeId: user.storeId,
      },
      orderBy: {
        name: "asc",
      },
    }),
    hasPermission(user.id, "product.update"),
  ]);

  if (!canUpdateProducts) {
    redirect("/products");
  }

  if (!product) {
    notFound();
  }

  return (
    <PageShell
      title="Edit Produk"
      description="Perbarui informasi produk dan stok."
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Produk", href: "/products" },
        { label: product.name },
      ]}
    >
      <ProductEditForm categories={categories.map(toCategoryOption)} product={toProductListItem(product)} />
    </PageShell>
  );
}
