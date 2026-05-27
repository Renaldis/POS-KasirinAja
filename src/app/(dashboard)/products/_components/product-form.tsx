"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { createProductAction } from "@/app/(dashboard)/products/_actions/product-actions";
import type { ProductCategoryOption } from "@/app/(dashboard)/products/_types/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProductFormProps = {
  categories: ProductCategoryOption[];
  canCreate: boolean;
};

export function ProductForm({ categories, canCreate }: ProductFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  if (!canCreate) {
    return null;
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createProductAction(formData);

      if (!result.success) {
        toast.error(result.message ?? "Produk gagal dibuat");
        return;
      }

      formRef.current?.reset();
      toast.success(result.message ?? "Produk berhasil dibuat");
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="rounded-lg border bg-white p-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Nama Produk" htmlFor="product-name">
          <Input id="product-name" name="name" placeholder="Kopi Sachet" required disabled={isPending} />
        </Field>
        <Field label="SKU" htmlFor="product-sku">
          <Input id="product-sku" name="sku" placeholder="KOPI-001" required disabled={isPending} />
        </Field>
        <Field label="Barcode" htmlFor="product-barcode">
          <Input id="product-barcode" name="barcode" placeholder="899..." disabled={isPending} />
        </Field>
        <Field label="Kategori" htmlFor="product-category">
          <select
            id="product-category"
            name="categoryId"
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
          <Input id="product-unit" name="unit" defaultValue="pcs" required disabled={isPending} />
        </Field>
        <Field label="Harga Modal" htmlFor="product-cost-price">
          <Input
            id="product-cost-price"
            name="costPrice"
            type="number"
            min="0"
            step="100"
            defaultValue="0"
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
            defaultValue="0"
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
            defaultValue="0"
            required
            disabled={isPending}
          />
        </Field>
        <label className="flex h-10 items-center gap-2 self-end text-sm font-medium">
          <input
            name="isActive"
            type="checkbox"
            defaultChecked
            disabled={isPending}
            className="h-4 w-4"
          />
          Aktif
        </label>
        <Button className="self-end md:col-span-2 xl:col-span-2" disabled={isPending} type="submit">
          {isPending ? "Menyimpan..." : "Tambah Produk"}
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
