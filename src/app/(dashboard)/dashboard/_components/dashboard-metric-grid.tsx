import type { DashboardMetric } from "@/app/(dashboard)/dashboard/_types/dashboard";
import { Badge } from "@/components/ui/badge";

type DashboardMetricGridProps = {
  metrics: DashboardMetric[];
};

export function DashboardMetricGrid({ metrics }: DashboardMetricGridProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="rounded-lg border bg-(--card) p-4 text-(--card-foreground)"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-(--muted-foreground)">{metric.label}</p>
            <Badge variant="secondary">Live</Badge>
          </div>
          <p className="mt-3 text-2xl font-semibold">{metric.value}</p>
          <p className="mt-1 text-sm text-(--muted-foreground)">
            {metric.helper}
          </p>
        </div>
      ))}
    </section>
  );
}
