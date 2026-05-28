import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { AuditLogFilters } from "@/app/(dashboard)/audit-logs/_components/audit-log-filters";
import { AuditLogList } from "@/app/(dashboard)/audit-logs/_components/audit-log-list";
import type {
  AuditLogListItem,
  AuditUserOption,
} from "@/app/(dashboard)/audit-logs/_types/audit-log";
import { ListPagination } from "@/components/shared/list-pagination";
import { PageShell } from "@/components/shared/page-shell";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentUserWithAccess } from "@/lib/auth/server";
import { normalizePage, normalizePageSize } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

type AuditLogsPageProps = {
  searchParams: Promise<{
    q?: string;
    entity?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
    pageSize?: string;
  }>;
};

function getStartOfDay(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00.000`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function getEndOfDay(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function AuditLogsPage({ searchParams }: AuditLogsPageProps) {
  const user = await getCurrentUserWithAccess();
  const filters = await searchParams;

  if (!user) {
    redirect("/auth/login");
  }

  if (!user.storeId) {
    redirect("/auth/register");
  }

  const canReadAuditLogs = await hasPermission(user.id, "audit.read");

  if (!canReadAuditLogs) {
    redirect("/dashboard");
  }

  const search = filters.q?.trim() ?? "";
  const entity = filters.entity?.trim() || undefined;
  const userId = filters.userId?.trim() || undefined;
  const startDate = getStartOfDay(filters.startDate);
  const endDate = getEndOfDay(filters.endDate);
  const page = normalizePage(filters.page);
  const pageSize = normalizePageSize(filters.pageSize);
  const skip = (page - 1) * pageSize;

  const auditWhere: Prisma.AuditLogWhereInput = {
    storeId: user.storeId,
    ...(entity ? { entity: { contains: entity, mode: "insensitive" } } : {}),
    ...(userId ? { userId } : {}),
    ...(startDate || endDate
      ? {
          createdAt: {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { action: { contains: search, mode: "insensitive" } },
            { entity: { contains: search, mode: "insensitive" } },
            { entityId: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [logs, totalLogs, users] = await Promise.all([
    prisma.auditLog.findMany({
      where: auditWhere,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      skip,
      take: pageSize,
    }),
    prisma.auditLog.count({
      where: auditWhere,
    }),
    prisma.user.findMany({
      where: {
        storeId: user.storeId,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    }),
  ]);

  const auditItems: AuditLogListItem[] = logs.map((log) => ({
    id: log.id,
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    metadata: log.metadata,
    createdAt: log.createdAt,
    userName: log.user?.name ?? null,
    userEmail: log.user?.email ?? null,
  }));
  const userOptions: AuditUserOption[] = users;

  return (
    <PageShell
      title="Audit Log"
      description="Lacak aktivitas penting seperti perubahan role, user, stok, transaksi, dan pembayaran."
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Audit Log" },
      ]}
    >
      <div className="space-y-4">
        <AuditLogFilters
          endDate={filters.endDate}
          entity={entity}
          search={search}
          startDate={filters.startDate}
          userId={userId}
          users={userOptions}
        />
        <AuditLogList logs={auditItems} />
        <ListPagination
          basePath="/audit-logs"
          page={page}
          pageSize={pageSize}
          totalItems={totalLogs}
          searchParams={{
            q: search,
            entity,
            userId,
            startDate: filters.startDate,
            endDate: filters.endDate,
          }}
        />
      </div>
    </PageShell>
  );
}
