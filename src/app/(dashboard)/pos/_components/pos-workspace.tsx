'use client';

import {
  Minus,
  Pause,
  Plus,
  Printer,
  RotateCcw,
  Search,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { toast } from 'sonner';
import {
  checkoutCashAction,
  checkoutManualTransferAction,
} from '@/app/(dashboard)/pos/_actions/pos-actions';
import type {
  ActivePosShift,
  PosProductItem,
} from '@/app/(dashboard)/pos/_types/pos';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePosCartStore } from '@/stores/pos-cart-store';

type PosWorkspaceProps = {
  activeShift: ActivePosShift;
  canCreateTransaction: boolean;
  canHoldTransaction: boolean;
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
  paymentMethod: string;
  paymentStatus: string;
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

type PaymentMode = 'cash' | 'manual_transfer';

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatMoney(value: number) {
  return currencyFormatter.format(value);
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
    target.isContentEditable
  );
}

function getItemsTotal(items: Array<{ sellingPrice: string; qty: number }>) {
  return items.reduce(
    (total, item) => total + Number(item.sellingPrice) * item.qty,
    0,
  );
}

export function PosWorkspace({
  activeShift,
  canCreateTransaction,
  canHoldTransaction,
  cashierName,
  products,
  storeAddress,
  storeName,
}: PosWorkspaceProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [receivedCash, setReceivedCash] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [receipt, setReceipt] = useState<ReceiptState>(null);
  const [isPending, startTransition] = useTransition();
  const items = usePosCartStore((state) => state.items);
  const heldTransactions = usePosCartStore((state) => state.heldTransactions);
  const addItem = usePosCartStore((state) => state.addItem);
  const decrementItem = usePosCartStore((state) => state.decrementItem);
  const updateQty = usePosCartStore((state) => state.updateQty);
  const removeItem = usePosCartStore((state) => state.removeItem);
  const clearCart = usePosCartStore((state) => state.clearCart);
  const holdCart = usePosCartStore((state) => state.holdCart);
  const resumeHold = usePosCartStore((state) => state.resumeHold);
  const deleteHold = usePosCartStore((state) => state.deleteHold);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return products;
    }

    return products.filter((product) => {
      return [
        product.name,
        product.sku,
        product.barcode ?? '',
        product.categoryName ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [products, query]);

  const subtotal = getItemsTotal(items);
  const paid = Number(receivedCash || 0);
  const change = Math.max(0, paid - subtotal);
  const canCheckout =
    canCreateTransaction &&
    items.length > 0 &&
    (paymentMode === 'manual_transfer' || paid >= subtotal) &&
    !isPending;

  const handleCheckout = useCallback(() => {
    if (!canCheckout) {
      return;
    }

    const receiptItems = items.map((item) => ({
      name: item.name,
      qty: item.qty,
      unitPrice: Number(item.sellingPrice),
      subtotal: Number(item.sellingPrice) * item.qty,
    }));

    startTransition(async () => {
      const checkoutItems = items.map((item) => ({
        productId: item.id,
        qty: item.qty,
      }));
      const result =
        paymentMode === 'cash'
          ? await checkoutCashAction({
              receivedCash: paid,
              items: checkoutItems,
            })
          : await checkoutManualTransferAction({
              items: checkoutItems,
            });

      if (!result.success) {
        toast.error(result.message ?? 'Transaksi gagal diproses');
        return;
      }

      setReceipt({
        invoiceNumber: result.invoiceNumber ?? '-',
        cashierName,
        createdAt: new Date().toISOString(),
        paid: paymentMode === 'cash' ? paid : 0,
        change:
          paymentMode === 'cash' && 'change' in result
            ? Number(result.change ?? 0)
            : 0,
        paymentMethod: paymentMode === 'cash' ? 'Cash' : 'Manual Transfer',
        paymentStatus: paymentMode === 'cash' ? 'Paid' : 'Pending',
        storeAddress,
        storeName,
        total: subtotal,
        items: receiptItems,
      });
      clearCart();
      setReceivedCash('');
      toast.success(result.message ?? 'Transaksi berhasil');
    });
  }, [
    canCheckout,
    cashierName,
    clearCart,
    items,
    paid,
    paymentMode,
    storeAddress,
    storeName,
    subtotal,
  ]);

  const handleHoldCart = useCallback(() => {
    if (!canHoldTransaction) {
      toast.error('Kamu tidak memiliki akses hold transaksi.');
      return;
    }

    const hold = holdCart();

    if (!hold) {
      toast.error('Keranjang masih kosong.');
      return;
    }

    setReceivedCash('');
    toast.success('Transaksi berhasil di-hold.');
  }, [canHoldTransaction, holdCart]);

  const handleResumeHold = useCallback(
    (holdId: string) => {
      const hold = resumeHold(holdId);

      if (!hold) {
        toast.error('Transaksi hold tidak ditemukan.');
        return;
      }

      setReceivedCash('');
      toast.success('Transaksi hold dimuat ke keranjang.');
    },
    [resumeHold],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === '/' && !isEditableTarget(event.target)) {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (event.key === 'Enter' && event.target === searchInputRef.current) {
        const firstAvailableProduct = filteredProducts.find(
          (product) => product.stock > 0,
        );

        if (firstAvailableProduct) {
          event.preventDefault();
          addItem(firstAvailableProduct);
        }

        return;
      }

      if (event.key === 'F2') {
        event.preventDefault();
        handleCheckout();
        return;
      }

      if (event.key === 'F4') {
        event.preventDefault();
        handleHoldCart();
        return;
      }

      if (event.key === 'Escape') {
        if (receipt) {
          setReceipt(null);
          return;
        }

        if (query) {
          setQuery('');
          searchInputRef.current?.blur();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    addItem,
    filteredProducts,
    handleCheckout,
    handleHoldCart,
    query,
    receipt,
  ]);

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
                <p className="text-sm text-(--muted-foreground)">
                  Shift dibuka{' '}
                  {dateFormatter.format(new Date(activeShift.openedAt))}
                </p>
              </div>
              <Badge variant="outline">
                Modal {formatMoney(Number(activeShift.openingCash))}
              </Badge>
            </div>
            <div className="relative mt-4">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--muted-foreground)"
                aria-hidden="true"
              />
              <Input
                ref={searchInputRef}
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
                  className="flex min-h-32 gap-3 rounded-lg border bg-white p-3 text-left transition-colors hover:border-(--ring) disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border bg-(--muted) text-xs font-medium text-(--muted-foreground)">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full rounded-md object-cover"
                      />
                    ) : (
                      'IMG'
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold">
                      {product.name}
                    </p>
                    <p className="mt-1 truncate text-xs text-(--muted-foreground)">
                      SKU {product.sku}
                    </p>
                    <p className="mt-2 text-sm font-semibold">
                      {formatMoney(Number(product.sellingPrice))}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge variant={isLowStock ? 'secondary' : 'outline'}>
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
                <h2 className="text-base font-semibold">
                  Produk tidak ditemukan
                </h2>
                <p className="mt-1 text-sm text-(--muted-foreground)">
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
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleHoldCart}
                  disabled={!canHoldTransaction}
                >
                  <Pause className="h-4 w-4" aria-hidden="true" />
                  Hold
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearCart}
                >
                  Kosongkan
                </Button>
              </div>
            ) : null}

            {heldTransactions.length > 0 ? (
              <div className="mt-4 space-y-2 rounded-md border bg-(--muted) p-3">
                {heldTransactions.map((hold) => (
                  <div
                    key={hold.id}
                    className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {hold.label}
                      </p>
                      <p className="text-xs text-(--muted-foreground)">
                        {hold.items.length} item -{' '}
                        {formatMoney(getItemsTotal(hold.items))}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label="Resume hold"
                        onClick={() => handleResumeHold(hold.id)}
                      >
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label="Hapus hold"
                        onClick={() => deleteHold(hold.id)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-4 min-h-56 space-y-3">
            {items.length === 0 ? (
              <div className="flex min-h-52 items-center justify-center rounded-lg border border-dashed p-4 text-center">
                <p className="text-sm text-(--muted-foreground)">
                  Pilih produk untuk mulai transaksi.
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {item.name}
                      </p>
                      <p className="mt-1 text-xs text-(--muted-foreground)">
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
                        onChange={(event) =>
                          updateQty(item.id, Number(event.target.value))
                        }
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
              <p className="text-sm font-medium">Metode Pembayaran</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={paymentMode === 'cash' ? 'default' : 'outline'}
                  onClick={() => setPaymentMode('cash')}
                >
                  Cash
                </Button>
                <Button
                  type="button"
                  variant={
                    paymentMode === 'manual_transfer' ? 'default' : 'outline'
                  }
                  onClick={() => setPaymentMode('manual_transfer')}
                >
                  Transfer
                </Button>
              </div>
            </div>
            {paymentMode === 'cash' ? (
              <>
                <div className="space-y-2">
                  <label
                    htmlFor="received-cash"
                    className="text-sm font-medium"
                  >
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
              </>
            ) : (
              <p className="rounded-md border bg-(--muted) p-3 text-sm text-(--muted-foreground)">
                Transfer manual akan masuk sebagai pending. Stok baru berkurang
                setelah pembayaran di-approve.
              </p>
            )}
            {!canCreateTransaction ? (
              <p className="text-sm text-(--destructive)">
                Kamu tidak memiliki akses untuk membuat transaksi.
              </p>
            ) : null}
            <Button
              type="button"
              className="w-full"
              disabled={!canCheckout}
              onClick={handleCheckout}
            >
              {isPending
                ? 'Memproses...'
                : paymentMode === 'cash'
                  ? 'Bayar Cash'
                  : 'Buat Transfer Pending'}
            </Button>
            {receipt ? (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4" aria-hidden="true" />
                Cetak Struk Terakhir
              </Button>
            ) : null}
          </div>
        </aside>
      </div>

      {receipt ? (
        <div className="print-receipt">
          <div className="mx-auto w-70 bg-white p-4 text-sm text-black">
            <h1 className="text-center text-base font-semibold">
              {receipt.storeName}
            </h1>
            {receipt.storeAddress ? (
              <p className="mt-1 text-center text-xs">{receipt.storeAddress}</p>
            ) : null}
            <p className="mt-1 text-center text-xs">{receipt.invoiceNumber}</p>
            <p className="mt-1 text-center text-xs">
              {dateFormatter.format(new Date(receipt.createdAt))}
            </p>
            <p className="mt-1 text-center text-xs">
              Kasir: {receipt.cashierName}
            </p>
            <div className="my-3 border-t border-dashed border-black" />
            {receipt.items.map((item) => (
              <div
                key={`${receipt.invoiceNumber}-${item.name}`}
                className="mb-2"
              >
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
              <span>{receipt.paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span>Status</span>
              <span>{receipt.paymentStatus}</span>
            </div>
            <p className="mt-4 text-center text-xs">Terima kasih</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
