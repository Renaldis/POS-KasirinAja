import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/shared/page-shell";
import { getCurrentUserWithAccess } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const user = await getCurrentUserWithAccess();

  if (!user) {
    redirect("/auth/login");
  }

  if (!user.storeId) {
    redirect("/auth/register");
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    todaySales,
    todayTransactions,
    pendingTransferCount,
    lowStockProducts,
  ] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        storeId: user.storeId,
        transactionStatus: "completed",
        paymentStatus: "paid",
        createdAt: {
          gte: startOfDay,
        },
      },
      _sum: {
        total: true,
      },
    }),
    prisma.transaction.count({
      where: {
        storeId: user.storeId,
        createdAt: {
          gte: startOfDay,
        },
      },
    }),
    prisma.transaction.count({
      where: {
        storeId: user.storeId,
        paymentMethod: "manual_transfer",
        paymentStatus: "pending",
      },
    }),
    prisma.product.findMany({
      where: {
        storeId: user.storeId,
        isActive: true,
        stock: {
          lte: prisma.product.fields.minimumStock,
        },
      },
      orderBy: [
        {
          stock: "asc",
        },
        {
          name: "asc",
        },
      ],
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        minimumStock: true,
        unit: true,
      },
      take: 5,
    }),
  ]);

  const totalSales = Number(todaySales._sum.total?.toString() ?? 0);
  const currencyFormatter = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });
  const metrics = [
    {
      label: "Penjualan Hari Ini",
      value: currencyFormatter.format(totalSales),
      helper:
        totalSales > 0
          ? "Transaksi paid/completed"
          : "Belum ada transaksi paid",
    },
    {
      label: "Transaksi",
      value: String(todayTransactions),
      helper: `${pendingTransferCount} pending transfer`,
    },
    {
      label: "Produk Terlaris",
      value: "-",
      helper: "Data akan muncul setelah laporan produk",
    },
    {
      label: "Stok Menipis",
      value: String(lowStockProducts.length),
      helper: lowStockProducts.length > 0 ? "Perlu restock" : "Semua stok aman",
    },
  ];

  return (
    <PageShell
      title="Dashboard"
      description="Ringkasan operasional toko hari ini."
      breadcrumbs={[{ label: "Dashboard" }]}
      actions={
        <Button asChild>
          <Link href="/pos">Mulai POS</Link>
        </Button>
      }
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-lg border bg-[var(--card)] p-4 text-[var(--card-foreground)]"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-[var(--muted-foreground)]">
                {metric.label}
              </p>
              <Badge variant="secondary">MVP</Badge>
            </div>
            <p className="mt-3 text-2xl font-semibold">{metric.value}</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {metric.helper}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-lg border bg-[var(--card)] p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Grafik Penjualan</h2>
            <Badge>7 Hari</Badge>
          </div>
          <div className="mt-5 flex h-64 items-center justify-center rounded-md border border-dashed bg-[var(--muted)] text-sm text-[var(--muted-foreground)]">
            Data grafik akan muncul setelah laporan penjualan selesai.
          </div>
        </div>

        <div className="rounded-lg border bg-[var(--card)] p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Stok Menipis</h2>
            <Button asChild size="sm" variant="outline">
              <Link href="/stocks?stock=low">Lihat Semua</Link>
            </Button>
          </div>
          <div className="mt-5 space-y-3">
            {lowStockProducts.length > 0 ? (
              lowStockProducts.map((product) => (
                <Link
                  key={product.id}
                  href={`/stocks/products/${product.id}`}
                  className="block rounded-md border bg-white px-3 py-2 transition-colors hover:border-[var(--ring)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {product.name}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        SKU {product.sku}
                      </p>
                    </div>
                    <Badge
                      className={
                        product.stock <= 0
                          ? "border-transparent bg-[var(--destructive)] text-white"
                          : undefined
                      }
                      variant={product.stock <= 0 ? "default" : "secondary"}
                    >
                      {product.stock} {product.unit}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    Minimum {product.minimumStock} {product.unit}
                  </p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">
                Belum ada produk yang mencapai stok minimum.
              </p>
            )}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
