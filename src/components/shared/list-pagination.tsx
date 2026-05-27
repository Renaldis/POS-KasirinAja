"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pageSizeOptions } from "@/lib/pagination";

type ListPaginationProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  basePath: string;
  searchParams?: Record<string, string | number | undefined>;
};

function buildHref(
  basePath: string,
  searchParams: Record<string, string | number | undefined>,
  page: number,
  pageSize: number,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }

  params.set("page", String(page));
  params.set("pageSize", String(pageSize));

  return `${basePath}?${params.toString()}`;
}

export function ListPagination({
  page,
  pageSize,
  totalItems,
  basePath,
  searchParams = {},
}: ListPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-[var(--muted-foreground)]">
        Menampilkan {startItem}-{endItem} dari {totalItems} data
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
          Rows
          <select
            defaultValue={pageSize}
            className="h-9 rounded-md border bg-white px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            onChange={(event) => {
              window.location.href = buildHref(basePath, searchParams, 1, Number(event.target.value));
            }}
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center justify-end gap-2">
          <Button asChild size="sm" variant="outline">
            <Link
              aria-disabled={safePage <= 1}
              className={safePage <= 1 ? "pointer-events-none opacity-50" : ""}
              href={buildHref(basePath, searchParams, Math.max(1, safePage - 1), pageSize)}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Sebelumnya
            </Link>
          </Button>
          <span className="min-w-20 text-center text-sm text-[var(--muted-foreground)]">
            {safePage}/{totalPages}
          </span>
          <Button asChild size="sm" variant="outline">
            <Link
              aria-disabled={safePage >= totalPages}
              className={safePage >= totalPages ? "pointer-events-none opacity-50" : ""}
              href={buildHref(basePath, searchParams, Math.min(totalPages, safePage + 1), pageSize)}
            >
              Berikutnya
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
