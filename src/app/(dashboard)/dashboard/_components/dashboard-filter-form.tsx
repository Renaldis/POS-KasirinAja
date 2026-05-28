import type { PeriodOption } from '@/app/(dashboard)/dashboard/_types/dashboard';
import { Button } from '@/components/ui/button';

type DashboardFilterFormProps = {
  endDate: string;
  period: PeriodOption;
  startDate: string;
};

export function DashboardFilterForm({
  endDate,
  period,
  startDate,
}: DashboardFilterFormProps) {
  return (
    <form className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-[160px_160px_160px_auto]">
      <select
        name="period"
        defaultValue={period}
        className="h-10 rounded-md border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
      >
        <option value="today">Hari ini</option>
        <option value="7d">7 hari</option>
        <option value="30d">30 hari</option>
        <option value="custom">Custom</option>
      </select>
      <input
        name="startDate"
        type="date"
        defaultValue={startDate}
        className="h-10 rounded-md border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
      />
      <input
        name="endDate"
        type="date"
        defaultValue={endDate}
        className="h-10 rounded-md border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
      />
      <Button type="submit">Filter</Button>
    </form>
  );
}
