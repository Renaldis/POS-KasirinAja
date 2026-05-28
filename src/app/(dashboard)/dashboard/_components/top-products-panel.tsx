import Link from "next/link";
import type { DashboardTopProduct } from "@/app/(dashboard)/dashboard/_types/dashboard";
import { Button } from "@/components/ui/button";

type TopProductsPanelProps = {
  products: DashboardTopProduct[];
};

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function TopProductsPanel({ products }: TopProductsPanelProps) {
  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Produk Terlaris</h2>
        <Button asChild size="sm" variant="outline">
          <Link href="/reports">Laporan</Link>
        </Button>
      </div>
      <div className="mt-5 space-y-3">
        {products.length > 0 ? (
          products.map((product) => (
            <div
              key={product.productName}
              className="rounded-md border bg-white px-3 py-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{product.productName}</p>
                  <p className="text-xs text-(--muted-foreground)">
                    Qty {product.qty}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold">
                  {currencyFormatter.format(product.subtotal)}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-(--muted-foreground)">
            Belum ada produk terjual pada periode ini.
          </p>
        )}
      </div>
    </div>
  );
}
