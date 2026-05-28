import type { DashboardChartBucket } from '@/app/(dashboard)/dashboard/_types/dashboard';
import { Badge } from '@/components/ui/badge';

type SalesChartPanelProps = {
  buckets: DashboardChartBucket[];
  end: Date;
  maxTotal: number;
  start: Date;
};

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const compactCurrencyFormatter = new Intl.NumberFormat('id-ID', {
  notation: 'compact',
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
});

export function SalesChartPanel({
  buckets,
  end,
  maxTotal,
  start,
}: SalesChartPanelProps) {
  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Grafik Penjualan</h2>
        <Badge>
          {dateFormatter.format(start)} - {dateFormatter.format(end)}
        </Badge>
      </div>
      <div className="mt-5 flex h-64 items-end gap-2 border-b border-l px-2 pb-2">
        {buckets.map((bucket) => {
          const height = Math.max(
            6,
            Math.round((bucket.total / maxTotal) * 220),
          );

          return (
            <div
              key={bucket.key}
              className="flex min-w-0 flex-1 flex-col items-center gap-2"
            >
              <div className="flex h-55 w-full items-end">
                <div
                  className="w-full rounded-t bg-(--primary)"
                  style={{ height }}
                  title={`${dateFormatter.format(bucket.date)}: ${currencyFormatter.format(bucket.total)}`}
                />
              </div>
              <span className="w-full truncate text-center text-[10px] text-(--muted-foreground)">
                {dateFormatter.format(bucket.date)}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-sm text-(--muted-foreground)">
        Puncak harian {compactCurrencyFormatter.format(maxTotal)}.
      </p>
    </div>
  );
}
