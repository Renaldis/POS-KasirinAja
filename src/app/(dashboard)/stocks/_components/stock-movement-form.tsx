"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createStockMovementAction } from "@/app/(dashboard)/stocks/_actions/stock-actions";
import type { StockProductOption } from "@/app/(dashboard)/stocks/_types/stock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type StockMovementFormProps = {
  products: StockProductOption[];
  type: StockMovementFormType;
};

type StockMovementFormType = "stock_in" | "stock_out" | "adjustment";

const labels = {
  stock_in: {
    title: "Stok Masuk",
    qty: "Qty Masuk",
    submit: "Simpan Stok Masuk",
  },
  stock_out: {
    title: "Stok Keluar",
    qty: "Qty Keluar",
    submit: "Simpan Stok Keluar",
  },
  adjustment: {
    title: "Adjustment",
    qty: "Stok Akhir Aktual",
    submit: "Simpan Adjustment",
  },
} as const;

export function StockMovementForm({ products, type }: StockMovementFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const copy = labels[type];
  const isAdjustment = type === "adjustment";

  function handleSubmit(formData: FormData) {
    formData.set("type", type);

    startTransition(async () => {
      const result = await createStockMovementAction(formData);

      if (!result.success) {
        toast.error(result.message ?? "Mutasi stok gagal disimpan");
        return;
      }

      toast.success(result.message ?? "Mutasi stok berhasil disimpan");
      formRef.current?.reset();
      router.push("/stocks");
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4 rounded-lg border bg-white p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="product-id">Produk</Label>
          <select
            id="product-id"
            name="productId"
            className="h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            disabled={isPending}
            required
          >
            <option value="">Pilih produk</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} - stok {product.stock} {product.unit}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={isAdjustment ? "stock-after" : "qty"}>{copy.qty}</Label>
          <Input
            id={isAdjustment ? "stock-after" : "qty"}
            name={isAdjustment ? "stockAfter" : "qty"}
            type="number"
            min="0"
            step="1"
            disabled={isPending}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="note">Catatan</Label>
        <Input id="note" name="note" placeholder={`${copy.title} manual`} disabled={isPending} />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Menyimpan..." : copy.submit}
      </Button>
    </form>
  );
}
