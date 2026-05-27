"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { closeShiftAction } from "@/app/(dashboard)/shifts/_actions/shift-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CloseShiftFormProps = {
  shiftId: string;
};

export function CloseShiftForm({ shiftId }: CloseShiftFormProps) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    formData.set("shiftId", shiftId);

    startTransition(async () => {
      const result = await closeShiftAction(formData);

      if (!result.success) {
        toast.error(result.message ?? "Shift gagal ditutup");
        return;
      }

      toast.success(result.message ?? "Shift berhasil ditutup");
    });
  }

  return (
    <form action={handleSubmit} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
      <div className="space-y-2">
        <Label htmlFor="closing-cash">Uang Fisik Akhir</Label>
        <Input
          id="closing-cash"
          name="closingCash"
          type="number"
          min="0"
          step="100"
          disabled={isPending}
          required
        />
      </div>
      <Button type="submit" variant="destructive" disabled={isPending}>
        {isPending ? "Menutup..." : "Tutup Shift"}
      </Button>
    </form>
  );
}
