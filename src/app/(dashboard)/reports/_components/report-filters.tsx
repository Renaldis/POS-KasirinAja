import { Button } from "@/components/ui/button";

type ReportFiltersProps = {
  cashiers: Array<{
    id: string;
    name: string;
  }>;
  cashierId?: string;
  endDate?: string;
  paymentMethod?: string;
  startDate?: string;
  transactionStatus?: string;
};

export function ReportFilters({
  cashiers,
  cashierId,
  endDate,
  paymentMethod,
  startDate,
  transactionStatus,
}: ReportFiltersProps) {
  return (
    <form className="grid gap-3 rounded-lg border bg-white p-4 lg:grid-cols-[150px_150px_180px_180px_180px_auto]">
      <input
        name="startDate"
        type="date"
        defaultValue={startDate}
        className="h-10 rounded-md border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      />
      <input
        name="endDate"
        type="date"
        defaultValue={endDate}
        className="h-10 rounded-md border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      />
      <select
        name="cashierId"
        defaultValue={cashierId ?? ""}
        className="h-10 rounded-md border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        <option value="">Semua kasir</option>
        {cashiers.map((cashier) => (
          <option key={cashier.id} value={cashier.id}>
            {cashier.name}
          </option>
        ))}
      </select>
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
        name="transactionStatus"
        defaultValue={transactionStatus ?? ""}
        className="h-10 rounded-md border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        <option value="">Paid completed</option>
        <option value="completed">Completed</option>
        <option value="pending">Pending</option>
        <option value="cancelled">Cancelled</option>
        <option value="voided">Voided</option>
      </select>
      <Button type="submit">Filter</Button>
    </form>
  );
}
