import Link from "next/link";
import { Boxes, History, Pencil } from "lucide-react";
import { ProductImagePreview } from "@/app/(dashboard)/products/_components/product-image-preview";
import type { ProductDetail } from "@/app/(dashboard)/products/_types/product-detail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ProductDetailPanelProps = {
  canUpdate: boolean;
  product: ProductDetail;
};

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function ProductDetailPanel({ canUpdate, product }: ProductDetailPanelProps) {
  const isEmpty = product.stock <= 0;
  const isLowStock = product.stock <= product.minimumStock;
  const stockStatus = isEmpty ? "Kosong" : isLowStock ? "Menipis" : "Aman";

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-white p-4">
        <div className="grid gap-5 lg:grid-cols-[180px_1fr]">
          <div className="group relative flex aspect-square w-full max-w-44 items-center justify-center rounded-md border bg-(--muted) text-sm font-medium text-(--muted-foreground)">
            {product.imageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="h-full w-full rounded-md object-cover"
                />
                <ProductImagePreview
                  src={product.imageUrl}
                  alt={product.name}
                  triggerClassName="absolute inset-0 h-full w-full rounded-md bg-black/45 text-white opacity-0 transition-opacity hover:bg-black/55 group-hover:opacity-100 focus-visible:opacity-100"
                />
              </>
            ) : (
              "IMG"
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold">{product.name}</h2>
                  <Badge variant={product.isActive ? "default" : "outline"}>
                    {product.isActive ? "Aktif" : "Nonaktif"}
                  </Badge>
                  <Badge
                    className={
                      isEmpty
                        ? "border-transparent bg-(--destructive) text-white"
                        : undefined
                    }
                    variant={isEmpty ? "default" : isLowStock ? "secondary" : "outline"}
                  >
                    {stockStatus}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-(--muted-foreground)">
                  SKU {product.sku}
                  {product.barcode ? ` - ${product.barcode}` : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link href={`/stocks/products/${product.id}`}>
                    <History className="h-4 w-4" aria-hidden="true" />
                    Riwayat Stok
                  </Link>
                </Button>
                {canUpdate ? (
                  <Button asChild>
                    <Link href={`/products/${product.id}/edit`}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      Edit
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <InfoTile label="Kategori" value={product.categoryName ?? "-"} />
              <InfoTile
                label="Harga Jual"
                value={currencyFormatter.format(Number(product.sellingPrice))}
              />
              <InfoTile
                label="Harga Modal"
                value={currencyFormatter.format(Number(product.costPrice))}
              />
              <InfoTile label="Satuan" value={product.unit} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center gap-2">
            <Boxes className="h-4 w-4 text-(--muted-foreground)" aria-hidden="true" />
            <p className="text-sm text-(--muted-foreground)">Stok Saat Ini</p>
          </div>
          <p className="mt-3 text-2xl font-semibold">
            {product.stock} {product.unit}
          </p>
        </div>
        <InfoCard
          label="Minimum Stok"
          value={`${product.minimumStock} ${product.unit}`}
          helper="Batas notifikasi stok menipis"
        />
        <InfoCard
          label="Terakhir Diperbarui"
          value={dateFormatter.format(new Date(product.updatedAt))}
          helper={`Dibuat ${dateFormatter.format(new Date(product.createdAt))}`}
        />
      </section>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-(--muted-foreground)">{label}</p>
      <p className="mt-1 truncate text-sm font-medium">{value}</p>
    </div>
  );
}

function InfoCard({
  helper,
  label,
  value,
}: {
  helper: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-sm text-(--muted-foreground)">{label}</p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-(--muted-foreground)">{helper}</p>
    </div>
  );
}
