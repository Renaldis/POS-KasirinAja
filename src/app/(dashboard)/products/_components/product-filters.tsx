import { Search } from "lucide-react";
import type { ProductCategoryOption } from "@/app/(dashboard)/products/_types/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ProductFiltersProps = {
  categories: ProductCategoryOption[];
  search?: string;
  categoryId?: string;
  status?: string;
  stock?: string;
};

export function ProductFilters({
  categories,
  search,
  categoryId,
  status,
  stock,
}: ProductFiltersProps) {
  return (
    <form className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-[1fr_180px_150px_150px_auto]">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]"
          aria-hidden="true"
        />
        <Input name="q" defaultValue={search} placeholder="Cari nama, SKU, barcode" className="pl-9" />
      </div>
      <select
        name="categoryId"
        defaultValue={categoryId ?? ""}
        className="h-10 rounded-md border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        <option value="">Semua kategori</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <select
        name="status"
        defaultValue={status ?? ""}
        className="h-10 rounded-md border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        <option value="">Semua status</option>
        <option value="active">Aktif</option>
        <option value="inactive">Nonaktif</option>
      </select>
      <select
        name="stock"
        defaultValue={stock ?? ""}
        className="h-10 rounded-md border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        <option value="">Semua stok</option>
        <option value="low">Stok menipis</option>
      </select>
      <Button type="submit">Filter</Button>
    </form>
  );
}
