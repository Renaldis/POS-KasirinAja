import { redirect } from "next/navigation";
import { StockMovementType } from "@/generated/prisma/client";
import { StockMovementForm } from "@/app/(dashboard)/stocks/_components/stock-movement-form";
import type { StockProductOption } from "@/app/(dashboard)/stocks/_types/stock";
import { PageShell } from "@/components/shared/page-shell";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentUserWithAccess } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

type CreateStockMovementPageProps = {
  searchParams: Promise<{
    type?: string;
  }>;
};

const allowedTypes = [
  StockMovementType.stock_in,
  StockMovementType.stock_out,
  StockMovementType.adjustment,
] as const;

function normalizeMovementType(value?: string) {
  return allowedTypes.find((type) => type === value) ?? StockMovementType.stock_in;
}

const pageCopy = {
  [StockMovementType.stock_in]: {
    title: "Stok Masuk",
    description: "Tambahkan stok produk dari pembelian, restock, atau penerimaan barang.",
  },
  [StockMovementType.stock_out]: {
    title: "Stok Keluar",
    description: "Kurangi stok produk untuk barang rusak, hilang, atau keluar manual.",
  },
  [StockMovementType.adjustment]: {
    title: "Adjustment Stok",
    description: "Set stok akhir aktual berdasarkan hasil opname.",
  },
} as const;

export default async function CreateStockMovementPage({
  searchParams,
}: CreateStockMovementPageProps) {
  const user = await getCurrentUserWithAccess();
  const params = await searchParams;
  const type = normalizeMovementType(params.type);

  if (!user) {
    redirect("/auth/login");
  }

  if (!user.storeId) {
    redirect("/auth/register");
  }

  const canCreate = await hasPermission(
    user.id,
    type === StockMovementType.adjustment
      ? "stock.adjustment.create"
      : "stock.movement.create",
  );

  if (!canCreate) {
    redirect("/stocks");
  }

  const products = await prisma.product.findMany({
    where: {
      storeId: user.storeId,
      isActive: true,
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      sku: true,
      stock: true,
      unit: true,
    },
  });

  const productOptions: StockProductOption[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    stock: product.stock,
    unit: product.unit,
  }));

  return (
    <PageShell
      title={pageCopy[type].title}
      description={pageCopy[type].description}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Stok", href: "/stocks" },
        { label: pageCopy[type].title },
      ]}
    >
      <StockMovementForm products={productOptions} type={type} />
    </PageShell>
  );
}
