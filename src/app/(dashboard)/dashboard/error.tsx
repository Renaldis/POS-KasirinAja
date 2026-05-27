"use client";

import { Button } from "@/components/ui/button";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-lg border bg-[var(--card)] p-6">
      <h1 className="text-lg font-semibold">Dashboard gagal dimuat</h1>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
        Coba muat ulang halaman dashboard.
      </p>
      <Button className="mt-4" onClick={reset}>
        Muat Ulang
      </Button>
    </div>
  );
}
