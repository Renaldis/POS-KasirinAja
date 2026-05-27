import { CategoryForm } from "@/app/(dashboard)/products/_components/category-form";
import { CategoryList } from "@/app/(dashboard)/products/_components/category-list";
import type { CategoryListItem } from "@/app/(dashboard)/products/_types/category";

type CategoriesPanelProps = {
  categories: CategoryListItem[];
  canManage: boolean;
};

export function CategoriesPanel({ categories, canManage }: CategoriesPanelProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Kategori</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Kelompokkan produk agar pencarian dan laporan lebih rapi.
        </p>
      </div>

      {canManage ? <CategoryForm /> : null}
      <CategoryList canManage={canManage} categories={categories} />
    </section>
  );
}
