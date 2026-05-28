import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { PaymentMethod } from "@/generated/prisma/client";
import { PaymentActionsPanel } from "@/app/(dashboard)/payments/_components/payment-actions-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/shared/page-shell";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentUserWithAccess } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

type PaymentDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
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

export default async function PaymentDetailPage({ params }: PaymentDetailPageProps) {
  const user = await getCurrentUserWithAccess();
  const { id } = await params;

  if (!user) {
    redirect("/auth/login");
  }

  if (!user.storeId) {
    redirect("/auth/register");
  }

  const [canApprove, canReject] = await Promise.all([
    hasPermission(user.id, "payment.manual.approve"),
    hasPermission(user.id, "payment.manual.reject"),
  ]);

  if (!canApprove && !canReject) {
    redirect("/dashboard");
  }

  const payment = await prisma.payment.findFirst({
    where: {
      id,
      method: PaymentMethod.manual_transfer,
      transaction: {
        storeId: user.storeId,
      },
    },
    include: {
      transaction: {
        include: {
          cashier: {
            select: {
              name: true,
            },
          },
          items: true,
        },
      },
      approver: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!payment) {
    notFound();
  }

  return (
    <PageShell
      title="Detail Pembayaran"
      description={payment.transaction.invoiceNumber}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Pembayaran", href: "/payments" },
        { label: "Detail Pembayaran" },
      ]}
      actions={
        <Button asChild variant="outline">
          <Link href="/payments">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Kembali
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <section className="rounded-lg border bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">{payment.transaction.invoiceNumber}</h2>
                <Badge variant={payment.status === "pending" ? "secondary" : "outline"}>
                  {payment.status}
                </Badge>
                <Badge variant="outline">{payment.transaction.transactionStatus}</Badge>
              </div>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Kasir {payment.transaction.cashier.name} pada{" "}
                {dateFormatter.format(payment.createdAt)}
              </p>
            </div>
            <p className="text-2xl font-semibold">
              {currencyFormatter.format(Number(payment.amount))}
            </p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border p-3">
              <p className="text-xs text-[var(--muted-foreground)]">Metode</p>
              <p className="mt-1 text-sm font-medium">{payment.method}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-[var(--muted-foreground)]">Reference</p>
              <p className="mt-1 text-sm font-medium">{payment.reference ?? "-"}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-[var(--muted-foreground)]">Approver</p>
              <p className="mt-1 text-sm font-medium">{payment.approver?.name ?? "-"}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-[var(--muted-foreground)]">Approved At</p>
              <p className="mt-1 text-sm font-medium">
                {payment.approvedAt ? dateFormatter.format(payment.approvedAt) : "-"}
              </p>
            </div>
          </div>
          {payment.rejectedReason ? (
            <div className="mt-4 rounded-md border border-[var(--destructive)]/30 bg-red-50 p-3">
              <p className="text-sm font-medium text-[var(--destructive)]">Alasan Reject</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {payment.rejectedReason}
              </p>
            </div>
          ) : null}
        </section>

        {payment.proofUrl ? (
          <section className="rounded-lg border bg-white p-4">
            <h2 className="text-lg font-semibold">Bukti Transfer</h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={payment.proofUrl}
              alt={`Bukti transfer ${payment.transaction.invoiceNumber}`}
              className="mt-4 max-h-[480px] rounded-md border object-contain"
            />
          </section>
        ) : null}

        <section className="overflow-hidden rounded-lg border bg-white">
          <div className="grid grid-cols-[1fr_80px_120px_120px] gap-3 border-b bg-[var(--muted)] px-4 py-3 text-sm font-medium text-[var(--muted-foreground)]">
            <span>Item</span>
            <span>Qty</span>
            <span>Harga</span>
            <span className="text-right">Subtotal</span>
          </div>
          <div className="divide-y">
            {payment.transaction.items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[1fr_80px_120px_120px] gap-3 px-4 py-3 text-sm"
              >
                <span className="font-medium">{item.productName}</span>
                <span>{item.qty}</span>
                <span>{currencyFormatter.format(Number(item.unitPrice))}</span>
                <span className="text-right font-medium">
                  {currencyFormatter.format(Number(item.subtotal))}
                </span>
              </div>
            ))}
          </div>
        </section>

        <PaymentActionsPanel
          canApprove={canApprove}
          canReject={canReject}
          paymentId={payment.id}
          status={payment.status}
        />
      </div>
    </PageShell>
  );
}
