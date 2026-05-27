"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateCategoryAction } from "@/app/(dashboard)/products/_actions/category-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CategoryEditFormProps = {
  category: {
    id: string;
    name: string;
  };
};

export function CategoryEditForm({ category }: CategoryEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    formData.set("id", category.id);

    startTransition(async () => {
      const result = await updateCategoryAction(formData);

      if (!result.success) {
        toast.error(result.message ?? "Kategori gagal diperbarui");
        return;
      }

      toast.success(result.message ?? "Kategori berhasil diperbarui");
      router.push("/products/categories");
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="max-w-xl rounded-lg border bg-white p-4">
      <div className="space-y-2">
        <Label htmlFor="category-name">Nama Kategori</Label>
        <Input
          id="category-name"
          name="name"
          defaultValue={category.name}
          placeholder="Makanan"
          required
          disabled={isPending}
        />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" disabled={isPending} onClick={() => router.back()}>
          Batal
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>
    </form>
  );
}
