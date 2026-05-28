import { redirect } from "next/navigation";
import { PaymentMethod, PaymentStatus, type Prisma } from "@/generated/prisma/client";
import { PaymentFilters } from "@/app/(dashboard)/payments/_components/payment-filters";
import { PaymentList } from "@/app/(dashboard)/payments/_components/payment-list";
import type { PaymentListItem } from "@/app/(dashboard)/payments/_types/payment";
import { ListPagination } from "@/components/shared/list-pagination";
import { PageShell } from "@/components/shared/page-shell";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentUserWithAccess } from "@/lib/auth/server";
import { normalizePage, normalizePageSize } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

type PaymentsPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
    pageSize?: string;
  }>;
};

function normalizePaymentStatus(value?: string) {
  if (!value) {
    return undefined;
  }

  return Object.values(PaymentStatus).includes(value as PaymentStatus)
    ? (value as PaymentStatus)
    : undefined;
}

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const user = await getCurrentUserWithAccess();
  const filters = await searchParams;

  if (!user) {
    redirect("/auth/login");
  }

  if (!user.storeId) {
    redirect("/auth/register");
  }

  const [canApprove, canReject] = await Promise.all([
    hasPermission(user.id, "payment.manual.approve"),
    hasPermission(user.id, "payment.manual.reject"),
  ]);

  if (!canApprove && !canReject) {
    redirect("/dashboard");
  }

  const search = filters.q?.trim() ?? "";
  const status = normalizePaymentStatus(filters.status);
  const page = normalizePage(filters.page);
  const pageSize = normalizePageSize(filters.pageSize);
  const paymentWhere: Prisma.PaymentWhereInput = {
    method: PaymentMethod.manual_transfer,
    ...(status ? { status } : {}),
    transaction: {
      storeId: user.storeId,
      ...(search
        ? {
            OR: [
              { invoiceNumber: { contains: search, mode: "insensitive" as const } },
              { cashier: { name: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
  };

  const [payments, totalPayments] = await Promise.all([
    prisma.payment.findMany({
      where: paymentWhere,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        transaction: {
          select: {
            invoiceNumber: true,
            transactionStatus: true,
            cashier: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.payment.count({
      where: paymentWhere,
    }),
  ]);

  const paymentItems: PaymentListItem[] = payments.map((payment) => ({
    id: payment.id,
    invoiceNumber: payment.transaction.invoiceNumber,
    cashierName: payment.transaction.cashier.name,
    method: payment.method,
    status: payment.status,
    transactionStatus: payment.transaction.transactionStatus,
    amount: payment.amount.toString(),
    proofUrl: payment.proofUrl,
    createdAt: payment.createdAt.toISOString(),
  }));

  return (
    <PageShell
      title="Pembayaran"
      description="Kelola transfer manual pending dan approval pembayaran."
      breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Pembayaran" }]}
    >
      <div className="space-y-4">
        <PaymentFilters search={search} status={status} />
        <PaymentList payments={paymentItems} />
        <ListPagination
          basePath="/payments"
          page={page}
          pageSize={pageSize}
          totalItems={totalPayments}
          searchParams={{ q: search, status }}
        />
      </div>
    </PageShell>
  );
}
