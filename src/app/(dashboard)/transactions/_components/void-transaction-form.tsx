"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { voidTransactionAction } from "@/app/(dashboard)/transactions/_actions/transaction-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type VoidTransactionFormProps = {
  transactionId: string;
};

export function VoidTransactionForm({ transactionId }: VoidTransactionFormProps) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    formData.set("transactionId", transactionId);

    if (!window.confirm("Void transaksi ini? Stok item completed akan dikembalikan.")) {
      return;
    }

    startTransition(async () => {
      const result = await voidTransactionAction(formData);

      if (!result.success) {
        toast.error(result.message ?? "Transaksi gagal di-void");
        return;
      }

      toast.success(result.message ?? "Transaksi berhasil di-void");
    });
  }

  return (
    <form action={handleSubmit} className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-[1fr_auto] md:items-end">
      <div className="space-y-2">
        <label htmlFor="void-reason" className="text-sm font-medium">
          Alasan Void
        </label>
        <Input
          id="void-reason"
          name="reason"
          placeholder="Contoh: salah input item"
          disabled={isPending}
          required
        />
      </div>
      <Button type="submit" variant="destructive" disabled={isPending}>
        {isPending ? "Memproses..." : "Void Transaksi"}
      </Button>
    </form>
  );
}
