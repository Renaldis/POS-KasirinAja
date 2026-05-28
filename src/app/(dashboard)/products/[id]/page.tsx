import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { ProductDetailPanel } from "@/app/(dashboard)/products/_components/product-detail-panel";
import type { ProductDetail } from "@/app/(dashboard)/products/_types/product-detail";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/shared/page-shell";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentUserWithAccess } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

type ProductDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const user = await getCurrentUserWithAccess();
  const { id } = await params;

  if (!user) {
    redirect("/auth/login");
  }

  if (!user.storeId) {
    redirect("/auth/register");
  }

  const [canReadProducts, canUpdateProducts] = await Promise.all([
    hasPermission(user.id, "product.read"),
    hasPermission(user.id, "product.update"),
  ]);

  if (!canReadProducts) {
    redirect("/dashboard");
  }

  const product = await prisma.product.findFirst({
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
  });

  if (!product) {
    notFound();
  }

  const productDetail: ProductDetail = {
    id: product.id,
    barcode: product.barcode,
    categoryName: product.category?.name ?? null,
    costPrice: product.costPrice.toString(),
    createdAt: product.createdAt.toISOString(),
    imageUrl: product.imageUrl,
    isActive: product.isActive,
    minimumStock: product.minimumStock,
    name: product.name,
    sellingPrice: product.sellingPrice.toString(),
    sku: product.sku,
    stock: product.stock,
    unit: product.unit,
    updatedAt: product.updatedAt.toISOString(),
  };

  return (
    <PageShell
      title="Detail Produk"
      description={product.name}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Produk", href: "/products" },
        { label: "Detail Produk" },
      ]}
      actions={
        <Button asChild variant="outline">
          <Link href="/products">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Kembali
          </Link>
        </Button>
      }
    >
      <ProductDetailPanel canUpdate={canUpdateProducts} product={productDetail} />
    </PageShell>
  );
}
