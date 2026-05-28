import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TransactionFiltersProps = {
  search?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  transactionStatus?: string;
};

export function TransactionFilters({
  search,
  paymentMethod,
  paymentStatus,
  transactionStatus,
}: TransactionFiltersProps) {
  return (
    <form className="grid gap-3 rounded-lg border bg-white p-4 lg:grid-cols-[1fr_180px_180px_180px_auto]">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]"
          aria-hidden="true"
        />
        <Input
          name="q"
          defaultValue={search}
          placeholder="Cari invoice atau kasir"
          className="pl-9"
        />
      </div>
      <select
        name="paymentMethod"
        defaultValue={paymentMethod ?? ""}
        className="h-10 rounded-md border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        <option value="">Semua metode</option>
        <option value="cash">Cash</option>
        <option value="manual_transfer">Transfer Manual</option>
        <option value="qris">QRIS</option>
        <option value="e_wallet">E-Wallet</option>
      </select>
      <select
        name="paymentStatus"
        defaultValue={paymentStatus ?? ""}
        className="h-10 rounded-md border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        <option value="">Semua payment</option>
        <option value="pending">Pending</option>
        <option value="paid">Paid</option>
        <option value="rejected">Rejected</option>
        <option value="expired">Expired</option>
        <option value="refunded">Refunded</option>
      </select>
      <select
        name="transactionStatus"
        defaultValue={transactionStatus ?? ""}
        className="h-10 rounded-md border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        <option value="">Semua status</option>
        <option value="draft">Draft</option>
        <option value="pending">Pending</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
        <option value="voided">Voided</option>
      </select>
      <Button type="submit">Filter</Button>
    </form>
  );
}
