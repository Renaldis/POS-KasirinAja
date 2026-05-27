import { redirect } from "next/navigation";
import { ShiftStatus } from "@/generated/prisma/client";
import { ActiveShiftCard } from "@/app/(dashboard)/shifts/_components/active-shift-card";
import { OpenShiftForm } from "@/app/(dashboard)/shifts/_components/open-shift-form";
import { ShiftHistoryList } from "@/app/(dashboard)/shifts/_components/shift-history-list";
import type { ActiveShift, ShiftListItem } from "@/app/(dashboard)/shifts/_types/shift";
import { ListPagination } from "@/components/shared/list-pagination";
import { normalizePage, normalizePageSize } from "@/lib/pagination";
import { PageShell } from "@/components/shared/page-shell";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentUserWithAccess } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

type ShiftsPageProps = {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
  }>;
};

export default async function ShiftsPage({ searchParams }: ShiftsPageProps) {
  const user = await getCurrentUserWithAccess();
  const filters = await searchParams;

  if (!user) {
    redirect("/auth/login");
  }

  if (!user.storeId) {
    redirect("/auth/register");
  }

  const [canOpenShift, canCloseShift, canReadAllShifts, canReadOwnShifts] = await Promise.all([
    hasPermission(user.id, "shift.open"),
    hasPermission(user.id, "shift.close"),
    hasPermission(user.id, "shift.read.all"),
    hasPermission(user.id, "shift.read.own"),
  ]);

  if (!canReadAllShifts && !canReadOwnShifts) {
    redirect("/dashboard");
  }

  const page = normalizePage(filters.page);
  const pageSize = normalizePageSize(filters.pageSize);
  const skip = (page - 1) * pageSize;
  const shiftWhere = {
    storeId: user.storeId,
    ...(canReadAllShifts ? {} : { cashierId: user.id }),
  };

  const [activeShift, shifts, totalShifts] = await Promise.all([
    prisma.shift.findFirst({
      where: {
        storeId: user.storeId,
        cashierId: user.id,
        status: ShiftStatus.open,
      },
      include: {
        cashier: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.shift.findMany({
      where: shiftWhere,
      orderBy: {
        openedAt: "desc",
      },
      include: {
        cashier: {
          select: {
            name: true,
          },
        },
      },
      skip,
      take: pageSize,
    }),
    prisma.shift.count({
      where: shiftWhere,
    }),
  ]);

  const activeShiftItem: ActiveShift | null = activeShift
    ? {
        id: activeShift.id,
        openingCash: activeShift.openingCash.toString(),
        openedAt: activeShift.openedAt.toISOString(),
        cashierName: activeShift.cashier.name,
      }
    : null;

  const shiftItems: ShiftListItem[] = shifts.map((shift) => ({
    id: shift.id,
    cashierName: shift.cashier.name,
    openingCash: shift.openingCash.toString(),
    closingCash: shift.closingCash?.toString() ?? null,
    expectedCash: shift.expectedCash?.toString() ?? null,
    cashDifference: shift.cashDifference?.toString() ?? null,
    status: shift.status,
    openedAt: shift.openedAt.toISOString(),
    closedAt: shift.closedAt?.toISOString() ?? null,
  }));

  return (
    <PageShell
      title="Shift Kasir"
      description="Buka, tutup, dan pantau riwayat shift kasir."
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Shift Kasir" },
      ]}
    >
      <div className="space-y-6">
        {activeShiftItem ? (
          <ActiveShiftCard canClose={canCloseShift} shift={activeShiftItem} />
        ) : canOpenShift ? (
          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">Buka Shift</h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                Masukkan modal awal sebelum mulai transaksi kasir.
              </p>
            </div>
            <OpenShiftForm />
          </section>
        ) : null}

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Riwayat Shift</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Riwayat ditampilkan sesuai hak akses user.
            </p>
          </div>
          <ShiftHistoryList shifts={shiftItems} />
          <ListPagination
            basePath="/shifts"
            page={page}
            pageSize={pageSize}
            totalItems={totalShifts}
          />
        </section>
      </div>
    </PageShell>
  );
}
