import Link from "next/link";
import type { DashboardLowStockProduct } from "@/app/(dashboard)/dashboard/_types/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type LowStockPanelProps = {
  products: DashboardLowStockProduct[];
};

export function LowStockPanel({ products }: LowStockPanelProps) {
  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Stok Menipis</h2>
        <Button asChild size="sm" variant="outline">
          <Link href="/stocks?stock=low">Lihat Semua</Link>
        </Button>
      </div>
      <div className="mt-5 space-y-3">
        {products.length > 0 ? (
          products.map((product) => (
            <Link
              key={product.id}
              href={`/stocks/products/${product.id}`}
              className="block rounded-md border bg-white px-3 py-2 transition-colors hover:border-(--ring)"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{product.name}</p>
                  <p className="text-xs text-(--muted-foreground)">SKU {product.sku}</p>
                </div>
                <Badge
                  className={
                    product.stock <= 0
                      ? "border-transparent bg-(--destructive) text-white"
                      : undefined
                  }
                  variant={product.stock <= 0 ? "default" : "secondary"}
                >
                  {product.stock} {product.unit}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-(--muted-foreground)">
                Minimum {product.minimumStock} {product.unit}
              </p>
            </Link>
          ))
        ) : (
          <p className="text-sm text-(--muted-foreground)">
            Belum ada produk yang mencapai stok minimum.
          </p>
        )}
      </div>
    </div>
  );
}
