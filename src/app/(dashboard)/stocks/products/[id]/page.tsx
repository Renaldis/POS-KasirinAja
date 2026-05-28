import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';
import { StockMovementList } from '@/app/(dashboard)/stocks/_components/stock-movement-list';
import type { StockMovementListItem } from '@/app/(dashboard)/stocks/_types/stock';
import { ListPagination } from '@/components/shared/list-pagination';
import { PageShell } from '@/components/shared/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { hasPermission } from '@/lib/auth/permissions';
import { getCurrentUserWithAccess } from '@/lib/auth/server';
import { normalizePage, normalizePageSize } from '@/lib/pagination';
import { prisma } from '@/lib/prisma';

type StockProductDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
  }>;
};

export default async function StockProductDetailPage({
  params,
  searchParams,
}: StockProductDetailPageProps) {
  const user = await getCurrentUserWithAccess();
  const { id } = await params;
  const filters = await searchParams;

  if (!user) {
    redirect('/auth/login');
  }

  if (!user.storeId) {
    redirect('/auth/register');
  }

  const canReadStock = await hasPermission(user.id, 'stock.read');

  if (!canReadStock) {
    redirect('/dashboard');
  }

  const page = normalizePage(filters.page);
  const pageSize = normalizePageSize(filters.pageSize);

  const [product, movements, totalMovements] = await Promise.all([
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
    prisma.stockMovement.findMany({
      where: {
        storeId: user.storeId,
        productId: id,
      },
      orderBy: {
        createdAt: 'desc',
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
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.stockMovement.count({
      where: {
        storeId: user.storeId,
        productId: id,
      },
    }),
  ]);

  if (!product) {
    notFound();
  }

  const isEmpty = product.stock <= 0;
  const isLowStock = product.stock <= product.minimumStock;
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
      title="Detail Stok Produk"
      description={product.name}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Stok', href: '/stocks' },
        { label: 'Detail Produk' },
      ]}
      actions={
        <Button asChild variant="outline">
          <Link href="/stocks">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Kembali
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <section className="rounded-lg border bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">{product.name}</h2>
                {isEmpty ? (
                  <Badge className="border-transparent bg-[var(--destructive)] text-white">
                    Kosong
                  </Badge>
                ) : isLowStock ? (
                  <Badge variant="secondary">Menipis</Badge>
                ) : (
                  <Badge variant="outline">Aman</Badge>
                )}
                {!product.isActive ? (
                  <Badge variant="outline">Nonaktif</Badge>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                SKU {product.sku}
                {product.barcode ? ` - ${product.barcode}` : ''}
              </p>
            </div>
            <p className="text-2xl font-semibold">
              {product.stock} {product.unit}
            </p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border p-3">
              <p className="text-xs text-[var(--muted-foreground)]">Kategori</p>
              <p className="mt-1 text-sm font-medium">
                {product.category?.name ?? '-'}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-[var(--muted-foreground)]">Stok Minimum</p>
              <p className="mt-1 text-sm font-medium">
                {product.minimumStock} {product.unit}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-[var(--muted-foreground)]">Status Produk</p>
              <p className="mt-1 text-sm font-medium">
                {product.isActive ? 'Aktif' : 'Nonaktif'}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-[var(--muted-foreground)]">Total Mutasi</p>
              <p className="mt-1 text-sm font-medium">{totalMovements}</p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Riwayat Stok Produk</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Timeline mutasi khusus untuk produk ini.
            </p>
          </div>
          <StockMovementList movements={movementItems} />
          <ListPagination
            basePath={`/stocks/products/${product.id}`}
            page={page}
            pageSize={pageSize}
            totalItems={totalMovements}
          />
        </section>
      </div>
    </PageShell>
  );
}
