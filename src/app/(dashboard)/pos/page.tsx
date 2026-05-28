import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ShiftStatus } from '@/generated/prisma/client';
import { PosWorkspace } from '@/app/(dashboard)/pos/_components/pos-workspace';
import type {
  ActivePosShift,
  PosProductItem,
} from '@/app/(dashboard)/pos/_types/pos';
import { PageShell } from '@/components/shared/page-shell';
import { Button } from '@/components/ui/button';
import { hasPermission } from '@/lib/auth/permissions';
import { getCurrentUserWithAccess } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma';

export default async function PosPage() {
  const user = await getCurrentUserWithAccess();

  if (!user) {
    redirect('/auth/login');
  }

  if (!user.storeId) {
    redirect('/auth/register');
  }

  const [
    canAccessPos,
    canCreateTransaction,
    canHoldTransaction,
    activeShift,
    products,
  ] = await Promise.all([
    hasPermission(user.id, 'pos.access'),
    hasPermission(user.id, 'pos.transaction.create'),
    hasPermission(user.id, 'pos.transaction.hold'),
    prisma.shift.findFirst({
      where: {
        storeId: user.storeId,
        cashierId: user.id,
        status: ShiftStatus.open,
      },
      select: {
        id: true,
        openingCash: true,
        openedAt: true,
      },
    }),
    prisma.product.findMany({
      where: {
        storeId: user.storeId,
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
      include: {
        category: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  if (!canAccessPos) {
    redirect('/dashboard');
  }

  const activeShiftItem: ActivePosShift | null = activeShift
    ? {
        id: activeShift.id,
        openingCash: activeShift.openingCash.toString(),
        openedAt: activeShift.openedAt.toISOString(),
      }
    : null;

  const productItems: PosProductItem[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    unit: product.unit,
    sellingPrice: product.sellingPrice.toString(),
    stock: product.stock,
    minimumStock: product.minimumStock,
    imageUrl: product.imageUrl,
    categoryName: product.category?.name ?? null,
  }));

  return (
    <PageShell
      title="POS Kasir"
      description="Cari produk, kelola keranjang, dan proses pembayaran cash."
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'POS Kasir' },
      ]}
    >
      {activeShiftItem ? (
        <PosWorkspace
          activeShift={activeShiftItem}
          canCreateTransaction={canCreateTransaction}
          canHoldTransaction={canHoldTransaction}
          cashierName={user.name}
          products={productItems}
          storeAddress={user.store?.address ?? null}
          storeName={user.store?.name ?? 'KasirinAja'}
        />
      ) : (
        <div className="flex min-h-72 items-center justify-center rounded-lg border border-dashed bg-white p-6 text-center">
          <div>
            <h2 className="text-base font-semibold">Shift belum dibuka</h2>
            <p className="mt-2 max-w-md text-sm text-(--muted-foreground)">
              Kasir wajib membuka shift sebelum membuat transaksi POS.
            </p>
            <Button asChild className="mt-4">
              <Link href="/shifts">Buka Shift</Link>
            </Button>
          </div>
        </div>
      )}
    </PageShell>
  );
}
