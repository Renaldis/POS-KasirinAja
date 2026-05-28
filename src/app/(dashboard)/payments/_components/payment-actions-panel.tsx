"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  approveManualPaymentAction,
  rejectManualPaymentAction,
  uploadPaymentProofAction,
} from "@/app/(dashboard)/payments/_actions/payment-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PaymentActionsPanelProps = {
  canApprove: boolean;
  canReject: boolean;
  paymentId: string;
  status: string;
};

export function PaymentActionsPanel({
  canApprove,
  canReject,
  paymentId,
  status,
}: PaymentActionsPanelProps) {
  const [isPending, startTransition] = useTransition();
  const isPaymentPending = status === "pending";

  function handleProofUpload(formData: FormData) {
    formData.set("paymentId", paymentId);

    startTransition(async () => {
      const result = await uploadPaymentProofAction(formData);

      if (!result.success) {
        toast.error(result.message ?? "Bukti transfer gagal diupload");
        return;
      }

      toast.success(result.message ?? "Bukti transfer berhasil diupload");
    });
  }

  function handleApprove() {
    if (!window.confirm("Approve pembayaran ini? Stok transaksi akan dikurangi.")) {
      return;
    }

    const formData = new FormData();
    formData.set("paymentId", paymentId);

    startTransition(async () => {
      const result = await approveManualPaymentAction(formData);

      if (!result.success) {
        toast.error(result.message ?? "Pembayaran gagal di-approve");
        return;
      }

      toast.success(result.message ?? "Pembayaran berhasil di-approve");
    });
  }

  function handleReject(formData: FormData) {
    formData.set("paymentId", paymentId);

    if (!window.confirm("Reject pembayaran ini? Transaksi akan dibatalkan.")) {
      return;
    }

    startTransition(async () => {
      const result = await rejectManualPaymentAction(formData);

      if (!result.success) {
        toast.error(result.message ?? "Pembayaran gagal di-reject");
        return;
      }

      toast.success(result.message ?? "Pembayaran berhasil di-reject");
    });
  }

  if (!isPaymentPending) {
    return null;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <form action={handleProofUpload} className="space-y-3 rounded-lg border bg-white p-4">
        <div className="space-y-2">
          <Label htmlFor="proof">Upload Bukti Transfer</Label>
          <Input id="proof" name="proof" type="file" accept="image/jpeg,image/png,image/webp" />
        </div>
        <Button type="submit" variant="outline" disabled={isPending}>
          Upload Bukti
        </Button>
      </form>

      <div className="space-y-3 rounded-lg border bg-white p-4">
        <div className="flex flex-wrap gap-2">
          {canApprove ? (
            <Button type="button" onClick={handleApprove} disabled={isPending}>
              Approve
            </Button>
          ) : null}
        </div>
        {canReject ? (
          <form action={handleReject} className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Input name="reason" placeholder="Alasan reject" disabled={isPending} required />
            <Button type="submit" variant="destructive" disabled={isPending}>
              Reject
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
