"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { createCategoryAction } from "@/app/(dashboard)/products/_actions/category-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CategoryForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createCategoryAction(formData);

      if (!result.success) {
        toast.error(result.message ?? "Kategori gagal dibuat");
        return;
      }

      formRef.current?.reset();
      toast.success(result.message ?? "Kategori berhasil dibuat");
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="rounded-lg border bg-white p-4">
      <div className="space-y-2">
        <Label htmlFor="category-name">Nama Kategori</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="category-name"
            name="name"
            placeholder="Makanan"
            required
            disabled={isPending}
          />
          <Button className="sm:w-36" disabled={isPending} type="submit">
            {isPending ? "Menyimpan..." : "Tambah"}
          </Button>
        </div>
      </div>
    </form>
  );
}
