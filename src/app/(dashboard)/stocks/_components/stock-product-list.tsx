import Link from "next/link";
import { Eye } from "lucide-react";
import type { StockProductItem } from "@/app/(dashboard)/stocks/_types/stock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type StockProductListProps = {
  products: StockProductItem[];
};

export function StockProductList({ products }: StockProductListProps) {
  if (products.length === 0) {
    return (
      <div className="flex min-h-44 items-center justify-center rounded-lg border border-dashed bg-white p-6 text-center">
        <div>
          <h2 className="text-base font-semibold">Produk tidak ditemukan</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Coba ubah filter stok atau kata kunci pencarian.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="hidden grid-cols-[1.4fr_0.8fr_0.7fr_0.7fr_0.7fr_auto] gap-3 border-b bg-[var(--muted)] px-4 py-3 text-sm font-medium text-[var(--muted-foreground)] xl:grid">
        <span>Produk</span>
        <span>Barcode</span>
        <span>Stok</span>
        <span>Minimum</span>
        <span>Status</span>
        <span className="sr-only">Aksi</span>
      </div>
      <div className="divide-y">
        {products.map((product) => {
          const isEmpty = product.stock <= 0;
          const isLowStock = product.stock <= product.minimumStock;

          return (
            <div
              key={product.id}
              className="grid gap-3 px-4 py-4 xl:grid-cols-[1.4fr_0.8fr_0.7fr_0.7fr_0.7fr_auto] xl:items-center"
            >
              <div>
                <p className="text-sm font-medium">{product.name}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  SKU {product.sku}
                </p>
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">
                {product.barcode ?? "-"}
              </p>
              <p className="text-sm font-semibold">
                {product.stock} {product.unit}
              </p>
              <p className="text-sm">
                {product.minimumStock} {product.unit}
              </p>
              <div className="flex flex-wrap gap-1">
                {isEmpty ? (
                  <Badge className="border-transparent bg-[var(--destructive)] text-white">
                    Kosong
                  </Badge>
                ) : isLowStock ? (
                  <Badge variant="secondary">Menipis</Badge>
                ) : (
                  <Badge variant="outline">Aman</Badge>
                )}
                {!product.isActive ? (
                  <Badge variant="outline">Nonaktif</Badge>
                ) : null}
              </div>
              <Button
                asChild
                size="icon"
                variant="ghost"
                title="Lihat riwayat stok"
              >
                <Link href={`/stocks/products/${product.id}`}>
                  <Eye className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">Lihat riwayat stok</span>
                </Link>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
