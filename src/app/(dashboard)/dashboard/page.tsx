import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardFilterForm } from "@/app/(dashboard)/dashboard/_components/dashboard-filter-form";
import { DashboardMetricGrid } from "@/app/(dashboard)/dashboard/_components/dashboard-metric-grid";
import { LowStockPanel } from "@/app/(dashboard)/dashboard/_components/low-stock-panel";
import { PendingTransfersPanel } from "@/app/(dashboard)/dashboard/_components/pending-transfers-panel";
import { SalesChartPanel } from "@/app/(dashboard)/dashboard/_components/sales-chart-panel";
import { TopProductsPanel } from "@/app/(dashboard)/dashboard/_components/top-products-panel";
import { getDashboardData } from "@/app/(dashboard)/dashboard/_services/dashboard-service";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/shared/page-shell";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentUserWithAccess } from "@/lib/auth/server";

type DashboardPageProps = {
  searchParams: Promise<{
    endDate?: string;
    period?: string;
    startDate?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await getCurrentUserWithAccess();
  const filters = await searchParams;

  if (!user) {
    redirect("/auth/login");
  }

  if (!user.storeId) {
    redirect("/auth/register");
  }

  const canReadDashboard = await hasPermission(user.id, "dashboard.store.read");

  if (!canReadDashboard) {
    redirect("/pos");
  }

  const dashboardData = await getDashboardData(user.storeId, filters);

  return (
    <PageShell
      title="Dashboard"
      description="Ringkasan operasional toko berdasarkan periode yang dipilih."
      breadcrumbs={[{ label: "Dashboard" }]}
      actions={
        <Button asChild>
          <Link href="/pos">Mulai POS</Link>
        </Button>
      }
    >
      <div className="space-y-4">
        <DashboardFilterForm
          endDate={dashboardData.dateRange.endDateValue}
          period={dashboardData.period}
          startDate={dashboardData.dateRange.startDateValue}
        />
        <DashboardMetricGrid metrics={dashboardData.metrics} />
        <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <SalesChartPanel
            buckets={dashboardData.chartBuckets}
            end={dashboardData.dateRange.end}
            maxTotal={dashboardData.maxChartTotal}
            start={dashboardData.dateRange.start}
          />
          <TopProductsPanel products={dashboardData.topProducts} />
        </section>
        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <PendingTransfersPanel payments={dashboardData.pendingTransferItems} />
          <LowStockPanel products={dashboardData.lowStockProducts} />
        </section>
      </div>
    </PageShell>
  );
}
