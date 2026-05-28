type ReportSummaryCardProps = {
  label: string;
  value: string;
  helper?: string;
};

export function ReportSummaryCard({ label, value, helper }: ReportSummaryCardProps) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {helper ? <p className="mt-1 text-sm text-[var(--muted-foreground)]">{helper}</p> : null}
    </div>
  );
}
