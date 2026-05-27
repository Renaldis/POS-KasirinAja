"use client";

import Link from "next/link";
import { Pencil, Power } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { deactivateProductAction } from "@/app/(dashboard)/products/_actions/product-actions";
import type { ProductListItem } from "@/app/(dashboard)/products/_types/product";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ProductListProps = {
  products: ProductListItem[];
  canUpdate: boolean;
  canDelete: boolean;
};

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function ProductList({ products, canUpdate, canDelete }: ProductListProps) {
  if (products.length === 0) {
    return (
      <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed bg-white p-6 text-center">
        <div>
          <h2 className="text-base font-semibold">Belum ada produk</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Tambahkan produk pertama, lalu stok awalnya akan langsung tercatat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="hidden grid-cols-[1.3fr_0.8fr_0.8fr_0.7fr_0.7fr_130px] gap-3 border-b bg-[var(--muted)] px-4 py-3 text-sm font-medium text-[var(--muted-foreground)] xl:grid">
        <span>Produk</span>
        <span>Kategori</span>
        <span>Harga</span>
        <span>Stok</span>
        <span>Status</span>
        <span className="text-right">Aksi</span>
      </div>
      <div className="divide-y">
        {products.map((product) => (
          <ProductRow
            key={product.id}
            canDelete={canDelete}
            canUpdate={canUpdate}
            product={product}
          />
        ))}
      </div>
    </div>
  );
}

function ProductRow({
  product,
  canUpdate,
  canDelete,
}: {
  product: ProductListItem;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const isLowStock = product.stock <= product.minimumStock;

  function handleDeactivate() {
    if (!window.confirm(`Nonaktifkan produk "${product.name}"?`)) {
      return;
    }

    const formData = new FormData();
    formData.set("id", product.id);

    startTransition(async () => {
      const result = await deactivateProductAction(formData);

      if (!result.success) {
        toast.error(result.message ?? "Produk gagal dinonaktifkan");
        return;
      }

      toast.success(result.message ?? "Produk berhasil dinonaktifkan");
    });
  }

  return (
    <div className="grid gap-3 px-4 py-4 xl:grid-cols-[1.3fr_0.8fr_0.8fr_0.7fr_0.7fr_130px] xl:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{product.name}</p>
        <p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">
          SKU {product.sku}
          {product.barcode ? ` - ${product.barcode}` : ""}
        </p>
      </div>
      <p className="text-sm text-[var(--muted-foreground)]">
        {product.categoryName ?? "Tanpa kategori"}
      </p>
      <div className="text-sm">
        <p>{currencyFormatter.format(Number(product.sellingPrice))}</p>
        <p className="text-xs text-[var(--muted-foreground)]">
          Modal {currencyFormatter.format(Number(product.costPrice))}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          {product.stock} {product.unit}
        </span>
        {isLowStock ? <Badge variant="secondary">Menipis</Badge> : null}
      </div>
      <Badge variant={product.isActive ? "default" : "outline"}>
        {product.isActive ? "Aktif" : "Nonaktif"}
      </Badge>
      <div className="flex justify-end gap-1">
        {canUpdate ? (
          <Button asChild size="icon" type="button" variant="ghost" aria-label="Edit produk">
            <Link href={`/products/${product.id}/edit`}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        ) : null}
        {canDelete && product.isActive ? (
          <Button
            size="icon"
            type="button"
            variant="ghost"
            disabled={isPending}
            aria-label="Nonaktifkan produk"
            onClick={handleDeactivate}
          >
            <Power className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
