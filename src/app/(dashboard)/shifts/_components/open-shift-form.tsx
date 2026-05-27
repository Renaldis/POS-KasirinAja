"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { openShiftAction } from "@/app/(dashboard)/shifts/_actions/shift-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OpenShiftForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await openShiftAction(formData);

      if (!result.success) {
        toast.error(result.message ?? "Shift gagal dibuka");
        return;
      }

      formRef.current?.reset();
      toast.success(result.message ?? "Shift berhasil dibuka");
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="rounded-lg border bg-white p-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="opening-cash">Modal Awal</Label>
          <Input
            id="opening-cash"
            name="openingCash"
            type="number"
            min="0"
            step="100"
            defaultValue="0"
            disabled={isPending}
            required
          />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Membuka..." : "Buka Shift"}
        </Button>
      </div>
    </form>
  );
}
