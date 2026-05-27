"use client";

import { Minus, Plus, Printer, Search, ShoppingCart, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { checkoutCashAction } from "@/app/(dashboard)/pos/_actions/pos-actions";
import type { ActivePosShift, PosProductItem } from "@/app/(dashboard)/pos/_types/pos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePosCartStore } from "@/stores/pos-cart-store";

type PosWorkspaceProps = {
  activeShift: ActivePosShift;
  canCreateTransaction: boolean;
  cashierName: string;
  products: PosProductItem[];
  storeAddress: string | null;
  storeName: string;
};

type ReceiptState = {
  invoiceNumber: string;
  cashierName: string;
  createdAt: string;
  paid: number;
  change: number;
  storeAddress: string | null;
  storeName: string;
  total: number;
  items: Array<{
    name: string;
    qty: number;
    unitPrice: number;
    subtotal: number;
  }>;
} | null;

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatMoney(value: number) {
  return currencyFormatter.format(value);
}

export function PosWorkspace({
  activeShift,
  canCreateTransaction,
  cashierName,
  products,
  storeAddress,
  storeName,
}: PosWorkspaceProps) {
  const [query, setQuery] = useState("");
  const [receivedCash, setReceivedCash] = useState("");
  const [receipt, setReceipt] = useState<ReceiptState>(null);
  const [isPending, startTransition] = useTransition();
  const items = usePosCartStore((state) => state.items);
  const addItem = usePosCartStore((state) => state.addItem);
  const decrementItem = usePosCartStore((state) => state.decrementItem);
  const updateQty = usePosCartStore((state) => state.updateQty);
  const removeItem = usePosCartStore((state) => state.removeItem);
  const clearCart = usePosCartStore((state) => state.clearCart);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return products;
    }

    return products.filter((product) => {
      return [product.name, product.sku, product.barcode ?? "", product.categoryName ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [products, query]);

  const subtotal = items.reduce((total, item) => {
    return total + Number(item.sellingPrice) * item.qty;
  }, 0);
  const paid = Number(receivedCash || 0);
  const change = Math.max(0, paid - subtotal);
  const canCheckout = canCreateTransaction && items.length > 0 && paid >= subtotal && !isPending;

  function handleCheckout() {
    const receiptItems = items.map((item) => ({
      name: item.name,
      qty: item.qty,
      unitPrice: Number(item.sellingPrice),
      subtotal: Number(item.sellingPrice) * item.qty,
    }));

    startTransition(async () => {
      const result = await checkoutCashAction({
        receivedCash: paid,
        items: items.map((item) => ({
          productId: item.id,
          qty: item.qty,
        })),
      });

      if (!result.success) {
        toast.error(result.message ?? "Transaksi gagal diproses");
        return;
      }

      setReceipt({
        invoiceNumber: result.invoiceNumber ?? "-",
        cashierName,
        createdAt: new Date().toISOString(),
        paid,
        change: Number(result.change ?? 0),
        storeAddress,
        storeName,
        total: subtotal,
        items: receiptItems,
      });
      clearCart();
      setReceivedCash("");
      toast.success(result.message ?? "Transaksi berhasil");
    });
  }

  function handlePrint() {
    window.print();
  }

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <section className="space-y-4">
          <div className="rounded-lg border bg-white p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Produk Aktif</h2>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Shift dibuka {dateFormatter.format(new Date(activeShift.openedAt))}
                </p>
              </div>
              <Badge variant="outline">Modal {formatMoney(Number(activeShift.openingCash))}</Badge>
            </div>
            <div className="relative mt-4">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]"
                aria-hidden="true"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari nama, SKU, barcode, atau kategori"
                className="pl-9"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {filteredProducts.map((product) => {
              const isOutOfStock = product.stock <= 0;
              const isLowStock = product.stock <= product.minimumStock;

              return (
                <button
                  key={product.id}
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => addItem(product)}
                  className="flex min-h-32 gap-3 rounded-lg border bg-white p-3 text-left transition-colors hover:border-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border bg-[var(--muted)] text-xs font-medium text-[var(--muted-foreground)]">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full rounded-md object-cover"
                      />
                    ) : (
                      "IMG"
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold">{product.name}</p>
                    <p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">
                      SKU {product.sku}
                    </p>
                    <p className="mt-2 text-sm font-semibold">
                      {formatMoney(Number(product.sellingPrice))}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge variant={isLowStock ? "secondary" : "outline"}>
                        {product.stock} {product.unit}
                      </Badge>
                      {product.categoryName ? (
                        <Badge variant="outline">{product.categoryName}</Badge>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredProducts.length === 0 ? (
            <div className="flex min-h-44 items-center justify-center rounded-lg border border-dashed bg-white p-6 text-center">
              <div>
                <h2 className="text-base font-semibold">Produk tidak ditemukan</h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Coba kata kunci lain atau cek status produk di halaman produk.
                </p>
              </div>
            </div>
          ) : null}
        </section>

        <aside className="rounded-lg border bg-white p-4 xl:sticky xl:top-20 xl:self-start">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" aria-hidden="true" />
              <h2 className="text-lg font-semibold">Keranjang</h2>
            </div>
            {items.length > 0 ? (
              <Button type="button" variant="ghost" size="sm" onClick={clearCart}>
                Kosongkan
              </Button>
            ) : null}
          </div>

          <div className="mt-4 min-h-56 space-y-3">
            {items.length === 0 ? (
              <div className="flex min-h-52 items-center justify-center rounded-lg border border-dashed p-4 text-center">
                <p className="text-sm text-[var(--muted-foreground)]">
                  Pilih produk untuk mulai transaksi.
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {formatMoney(Number(item.sellingPrice))} / {item.unit}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="Hapus item"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        aria-label="Kurangi qty"
                        onClick={() => decrementItem(item.id)}
                      >
                        <Minus className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Input
                        value={item.qty}
                        min={1}
                        max={item.stock}
                        type="number"
                        className="h-10 w-20 text-center"
                        onChange={(event) => updateQty(item.id, Number(event.target.value))}
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        aria-label="Tambah qty"
                        onClick={() => addItem(item)}
                        disabled={item.qty >= item.stock}
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                    <p className="text-sm font-semibold">
                      {formatMoney(Number(item.sellingPrice) * item.qty)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 space-y-3 border-t pt-4">
            <div className="flex items-center justify-between text-sm">
              <span>Subtotal</span>
              <span className="font-semibold">{formatMoney(subtotal)}</span>
            </div>
            <div className="space-y-2">
              <label htmlFor="received-cash" className="text-sm font-medium">
                Uang Diterima
              </label>
              <Input
                id="received-cash"
                type="number"
                min="0"
                step="100"
                value={receivedCash}
                onChange={(event) => setReceivedCash(event.target.value)}
                disabled={!canCreateTransaction || isPending}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Kembalian</span>
              <span className="font-semibold">{formatMoney(change)}</span>
            </div>
            {!canCreateTransaction ? (
              <p className="text-sm text-[var(--destructive)]">
                Kamu tidak memiliki akses untuk membuat transaksi.
              </p>
            ) : null}
            <Button type="button" className="w-full" disabled={!canCheckout} onClick={handleCheckout}>
              {isPending ? "Memproses..." : "Bayar Cash"}
            </Button>
            {receipt ? (
              <Button type="button" variant="outline" className="w-full" onClick={handlePrint}>
                <Printer className="h-4 w-4" aria-hidden="true" />
                Cetak Struk Terakhir
              </Button>
            ) : null}
          </div>
        </aside>
      </div>

      {receipt ? (
        <div className="print-receipt">
          <div className="mx-auto w-[280px] bg-white p-4 text-sm text-black">
            <h1 className="text-center text-base font-semibold">{receipt.storeName}</h1>
            {receipt.storeAddress ? (
              <p className="mt-1 text-center text-xs">{receipt.storeAddress}</p>
            ) : null}
            <p className="mt-1 text-center text-xs">{receipt.invoiceNumber}</p>
            <p className="mt-1 text-center text-xs">
              {dateFormatter.format(new Date(receipt.createdAt))}
            </p>
            <p className="mt-1 text-center text-xs">Kasir: {receipt.cashierName}</p>
            <div className="my-3 border-t border-dashed border-black" />
            {receipt.items.map((item) => (
              <div key={`${receipt.invoiceNumber}-${item.name}`} className="mb-2">
                <div className="flex justify-between gap-3">
                  <span>{item.name}</span>
                  <span>{formatMoney(item.subtotal)}</span>
                </div>
                <p className="text-xs">
                  {item.qty} x {formatMoney(item.unitPrice)}
                </p>
              </div>
            ))}
            <div className="my-3 border-t border-dashed border-black" />
            <div className="flex justify-between">
              <span>Total</span>
              <span>{formatMoney(receipt.total)}</span>
            </div>
            <div className="flex justify-between">
              <span>Bayar</span>
              <span>{formatMoney(receipt.paid)}</span>
            </div>
            <div className="flex justify-between">
              <span>Kembali</span>
              <span>{formatMoney(receipt.change)}</span>
            </div>
            <div className="flex justify-between">
              <span>Metode</span>
              <span>Cash</span>
            </div>
            <div className="flex justify-between">
              <span>Status</span>
              <span>Paid</span>
            </div>
            <p className="mt-4 text-center text-xs">Terima kasih</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
