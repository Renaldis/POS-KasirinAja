"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteCategoryAction } from "@/app/(dashboard)/products/_actions/category-actions";
import type { CategoryListItem } from "@/app/(dashboard)/products/_types/category";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type CategoryListProps = {
  categories: CategoryListItem[];
  canManage: boolean;
};

export function CategoryList({ categories, canManage }: CategoryListProps) {
  if (categories.length === 0) {
    return (
      <div className="flex min-h-44 items-center justify-center rounded-lg border border-dashed bg-white p-6 text-center">
        <div>
          <h2 className="text-base font-semibold">Belum ada kategori</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Tambahkan kategori seperti Makanan, Minuman, Rokok, atau Frozen Food.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="grid grid-cols-[1fr_auto] gap-3 border-b bg-[var(--muted)] px-4 py-3 text-sm font-medium text-[var(--muted-foreground)] sm:grid-cols-[1fr_140px_160px]">
        <span>Nama</span>
        <span className="hidden sm:block">Produk</span>
        <span className="text-right">Aksi</span>
      </div>
      <div className="divide-y">
        {categories.map((category) => (
          <CategoryRow key={category.id} canManage={canManage} category={category} />
        ))}
      </div>
    </div>
  );
}

function CategoryRow({
  category,
  canManage,
}: {
  category: CategoryListItem;
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(`Hapus kategori "${category.name}"? Produk terkait akan menjadi tanpa kategori.`)) {
      return;
    }

    const formData = new FormData();
    formData.set("id", category.id);

    startTransition(async () => {
      const result = await deleteCategoryAction(formData);

      if (!result.success) {
        toast.error(result.message ?? "Kategori gagal dihapus");
        return;
      }

      toast.success(result.message ?? "Kategori berhasil dihapus");
    });
  }

  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[1fr_140px_160px]">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{category.name}</p>
        <p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">{category.slug}</p>
      </div>

      <div className="hidden sm:block">
        <Badge variant="secondary">{category.productCount} produk</Badge>
      </div>

      <div className="flex justify-end gap-1">
        {canManage ? (
          <>
            <Button asChild size="icon" type="button" variant="ghost" aria-label="Edit kategori">
              <Link href={`/products/categories/${category.id}/edit`}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              size="icon"
              type="button"
              variant="ghost"
              aria-label="Hapus kategori"
              disabled={isPending}
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
