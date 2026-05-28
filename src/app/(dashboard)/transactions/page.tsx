import { redirect } from "next/navigation";
import {
  PaymentMethod,
  PaymentStatus,
  type Prisma,
  TransactionStatus,
} from "@/generated/prisma/client";
import { TransactionFilters } from "@/app/(dashboard)/transactions/_components/transaction-filters";
import { TransactionList } from "@/app/(dashboard)/transactions/_components/transaction-list";
import type { TransactionListItem } from "@/app/(dashboard)/transactions/_types/transaction";
import { ListPagination } from "@/components/shared/list-pagination";
import { PageShell } from "@/components/shared/page-shell";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentUserWithAccess } from "@/lib/auth/server";
import { normalizePage, normalizePageSize } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

type TransactionsPageProps = {
  searchParams: Promise<{
    q?: string;
    paymentMethod?: string;
    paymentStatus?: string;
    transactionStatus?: string;
    page?: string;
    pageSize?: string;
  }>;
};

function normalizeEnumValue<T extends Record<string, string>>(
  enumObject: T,
  value?: string,
): T[keyof T] | undefined {
  if (!value) {
    return undefined;
  }

  return Object.values(enumObject).includes(value) ? (value as T[keyof T]) : undefined;
}

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const user = await getCurrentUserWithAccess();
  const filters = await searchParams;

  if (!user) {
    redirect("/auth/login");
  }

  if (!user.storeId) {
    redirect("/auth/register");
  }

  const [canReadAllTransactions, canReadOwnTransactions] = await Promise.all([
    hasPermission(user.id, "transaction.read.all"),
    hasPermission(user.id, "transaction.read.own"),
  ]);

  if (!canReadAllTransactions && !canReadOwnTransactions) {
    redirect("/dashboard");
  }

  const search = filters.q?.trim() ?? "";
  const paymentMethod = normalizeEnumValue(PaymentMethod, filters.paymentMethod);
  const paymentStatus = normalizeEnumValue(PaymentStatus, filters.paymentStatus);
  const transactionStatus = normalizeEnumValue(TransactionStatus, filters.transactionStatus);
  const page = normalizePage(filters.page);
  const pageSize = normalizePageSize(filters.pageSize);
  const skip = (page - 1) * pageSize;
  const transactionWhere: Prisma.TransactionWhereInput = {
    storeId: user.storeId,
    ...(canReadAllTransactions ? {} : { cashierId: user.id }),
    ...(paymentMethod ? { paymentMethod } : {}),
    ...(paymentStatus ? { paymentStatus } : {}),
    ...(transactionStatus ? { transactionStatus } : {}),
    ...(search
      ? {
          OR: [
            { invoiceNumber: { contains: search, mode: "insensitive" as const } },
            { cashier: { name: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [transactions, totalTransactions] = await Promise.all([
    prisma.transaction.findMany({
      where: transactionWhere,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        cashier: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
      skip,
      take: pageSize,
    }),
    prisma.transaction.count({
      where: transactionWhere,
    }),
  ]);

  const transactionItems: TransactionListItem[] = transactions.map((transaction) => ({
    id: transaction.id,
    invoiceNumber: transaction.invoiceNumber,
    cashierName: transaction.cashier.name,
    total: transaction.total.toString(),
    paymentMethod: transaction.paymentMethod,
    paymentStatus: transaction.paymentStatus,
    transactionStatus: transaction.transactionStatus,
    itemCount: transaction._count.items,
    createdAt: transaction.createdAt.toISOString(),
  }));

  return (
    <PageShell
      title="Transaksi"
      description="Lihat transaksi cash, transfer, void, dan status pembayaran."
      breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Transaksi" }]}
    >
      <div className="space-y-4">
        <TransactionFilters
          search={search}
          paymentMethod={paymentMethod}
          paymentStatus={paymentStatus}
          transactionStatus={transactionStatus}
        />
        <TransactionList transactions={transactionItems} />
        <ListPagination
          basePath="/transactions"
          page={page}
          pageSize={pageSize}
          totalItems={totalTransactions}
          searchParams={{ q: search, paymentMethod, paymentStatus, transactionStatus }}
        />
      </div>
    </PageShell>
  );
}
