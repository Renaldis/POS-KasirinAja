import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PaymentFiltersProps = {
  search?: string;
  status?: string;
};

export function PaymentFilters({ search, status }: PaymentFiltersProps) {
  return (
    <form className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-[1fr_180px_auto]">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]"
          aria-hidden="true"
        />
        <Input name="q" defaultValue={search} placeholder="Cari invoice atau kasir" className="pl-9" />
      </div>
      <select
        name="status"
        defaultValue={status ?? ""}
        className="h-10 rounded-md border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        <option value="">Semua status</option>
        <option value="pending">Pending</option>
        <option value="paid">Paid</option>
        <option value="rejected">Rejected</option>
      </select>
      <Button type="submit">Filter</Button>
    </form>
  );
}
