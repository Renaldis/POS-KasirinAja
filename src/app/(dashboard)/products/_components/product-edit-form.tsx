"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { updateProductAction } from "@/app/(dashboard)/products/_actions/product-actions";
import type {
  ProductCategoryOption,
  ProductListItem,
} from "@/app/(dashboard)/products/_types/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProductEditFormProps = {
  product: ProductListItem;
  categories: ProductCategoryOption[];
};

export function ProductEditForm({ product, categories }: ProductEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    formData.set("id", product.id);

    startTransition(async () => {
      const result = await updateProductAction(formData);

      if (!result.success) {
        toast.error(result.message ?? "Produk gagal diperbarui");
        return;
      }

      toast.success(result.message ?? "Produk berhasil diperbarui");
      router.push("/products");
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="rounded-lg border bg-white p-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Nama Produk" htmlFor="product-name">
          <Input id="product-name" name="name" defaultValue={product.name} required disabled={isPending} />
        </Field>
        <Field label="SKU" htmlFor="product-sku">
          <Input id="product-sku" name="sku" defaultValue={product.sku} required disabled={isPending} />
        </Field>
        <Field label="Barcode" htmlFor="product-barcode">
          <Input
            id="product-barcode"
            name="barcode"
            defaultValue={product.barcode ?? ""}
            disabled={isPending}
          />
        </Field>
        <Field label="Kategori" htmlFor="product-category">
          <select
            id="product-category"
            name="categoryId"
            defaultValue={product.categoryId ?? ""}
            className="h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            disabled={isPending}
          >
            <option value="">Tanpa kategori</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Satuan" htmlFor="product-unit">
          <Input id="product-unit" name="unit" defaultValue={product.unit} required disabled={isPending} />
        </Field>
        <Field label="Harga Modal" htmlFor="product-cost-price">
          <Input
            id="product-cost-price"
            name="costPrice"
            type="number"
            min="0"
            step="100"
            defaultValue={product.costPrice}
            required
            disabled={isPending}
          />
        </Field>
        <Field label="Harga Jual" htmlFor="product-selling-price">
          <Input
            id="product-selling-price"
            name="sellingPrice"
            type="number"
            min="0"
            step="100"
            defaultValue={product.sellingPrice}
            required
            disabled={isPending}
          />
        </Field>
        <Field label="Stok" htmlFor="product-stock">
          <Input
            id="product-stock"
            name="stock"
            type="number"
            min="0"
            defaultValue={product.stock}
            required
            disabled={isPending}
          />
        </Field>
        <Field label="Minimum Stok" htmlFor="product-minimum-stock">
          <Input
            id="product-minimum-stock"
            name="minimumStock"
            type="number"
            min="0"
            defaultValue={product.minimumStock}
            required
            disabled={isPending}
          />
        </Field>
        <label className="flex h-10 items-center gap-2 self-end text-sm font-medium">
          <input
            name="isActive"
            type="checkbox"
            defaultChecked={product.isActive}
            disabled={isPending}
            className="h-4 w-4"
          />
          Aktif
        </label>
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

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
