import Link from "next/link";
import { ClipboardList, Minus, Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { StockMovementType, type Prisma } from "@/generated/prisma/client";
import { StockFilters } from "@/app/(dashboard)/stocks/_components/stock-filters";
import { StockMovementList } from "@/app/(dashboard)/stocks/_components/stock-movement-list";
import { StockProductList } from "@/app/(dashboard)/stocks/_components/stock-product-list";
import type {
  StockMovementListItem,
  StockProductItem,
} from "@/app/(dashboard)/stocks/_types/stock";
import { ListPagination } from "@/components/shared/list-pagination";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentUserWithAccess } from "@/lib/auth/server";
import { normalizePage, normalizePageSize } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

type StocksPageProps = {
  searchParams: Promise<{
    q?: string;
    stock?: string;
    page?: string;
    pageSize?: string;
    movementPage?: string;
    movementPageSize?: string;
  }>;
};

export default async function StocksPage({ searchParams }: StocksPageProps) {
  const user = await getCurrentUserWithAccess();
  const filters = await searchParams;

  if (!user) {
    redirect("/auth/login");
  }

  if (!user.storeId) {
    redirect("/auth/register");
  }

  const [canReadStock, canCreateMovement, canCreateAdjustment] = await Promise.all([
    hasPermission(user.id, "stock.read"),
    hasPermission(user.id, "stock.movement.create"),
    hasPermission(user.id, "stock.adjustment.create"),
  ]);

  if (!canReadStock) {
    redirect("/dashboard");
  }

  const search = filters.q?.trim() ?? "";
  const stock = filters.stock?.trim() || undefined;
  const page = normalizePage(filters.page);
  const pageSize = normalizePageSize(filters.pageSize);
  const movementPage = normalizePage(filters.movementPage);
  const movementPageSize = normalizePageSize(filters.movementPageSize);
  const productWhere: Prisma.ProductWhereInput = {
    storeId: user.storeId,
    ...(stock === "low" ? { stock: { lte: prisma.product.fields.minimumStock } } : {}),
    ...(stock === "empty" ? { stock: 0 } : {}),
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

  const movementWhere: Prisma.StockMovementWhereInput = {
    storeId: user.storeId,
    ...(search
      ? {
          product: {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { sku: { contains: search, mode: "insensitive" as const } },
              { barcode: { contains: search, mode: "insensitive" as const } },
            ],
          },
        }
      : {}),
  };

  const [products, totalProducts, movements, totalMovements] = await Promise.all([
    prisma.product.findMany({
      where: productWhere,
      orderBy: {
        name: "asc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({
      where: productWhere,
    }),
    prisma.stockMovement.findMany({
      where: movementWhere,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        product: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
            name: true,
          },
        },
      },
      skip: (movementPage - 1) * movementPageSize,
      take: movementPageSize,
    }),
    prisma.stockMovement.count({
      where: movementWhere,
    }),
  ]);

  const productItems: StockProductItem[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    unit: product.unit,
    stock: product.stock,
    minimumStock: product.minimumStock,
    isActive: product.isActive,
  }));

  const movementItems: StockMovementListItem[] = movements.map((movement) => ({
    id: movement.id,
    productName: movement.product.name,
    userName: movement.user.name,
    type: movement.type,
    qty: movement.qty,
    stockBefore: movement.stockBefore,
    stockAfter: movement.stockAfter,
    note: movement.note,
    createdAt: movement.createdAt.toISOString(),
  }));

  return (
    <PageShell
      title="Stok"
      description="Pantau stok produk, stok menipis, dan semua riwayat mutasi."
      breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Stok" }]}
      actions={
        <>
          {canCreateMovement ? (
            <>
              <Button asChild variant="outline">
                <Link href={`/stocks/movements/create?type=${StockMovementType.stock_out}`}>
                  <Minus className="h-4 w-4" aria-hidden="true" />
                  Stok Keluar
                </Link>
              </Button>
              <Button asChild>
                <Link href={`/stocks/movements/create?type=${StockMovementType.stock_in}`}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Stok Masuk
                </Link>
              </Button>
            </>
          ) : null}
          {canCreateAdjustment ? (
            <Button asChild variant="outline">
              <Link href={`/stocks/movements/create?type=${StockMovementType.adjustment}`}>
                <ClipboardList className="h-4 w-4" aria-hidden="true" />
                Adjustment
              </Link>
            </Button>
          ) : null}
        </>
      }
    >
      <div className="space-y-6">
        <section className="space-y-4">
          <StockFilters search={search} stock={stock} />
          <StockProductList products={productItems} />
          <ListPagination
            basePath="/stocks"
            page={page}
            pageSize={pageSize}
            totalItems={totalProducts}
            searchParams={{ q: search, stock }}
          />
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Riwayat Mutasi</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Semua perubahan stok dari produk, POS, void, dan mutasi manual.
            </p>
          </div>
          <StockMovementList movements={movementItems} />
          <ListPagination
            basePath="/stocks"
            page={movementPage}
            pageSize={movementPageSize}
            pageParam="movementPage"
            pageSizeParam="movementPageSize"
            totalItems={totalMovements}
            searchParams={{
              q: search,
              stock,
              page,
              pageSize,
              movementPage: movementPage,
              movementPageSize,
            }}
          />
        </section>
      </div>
    </PageShell>
  );
}
