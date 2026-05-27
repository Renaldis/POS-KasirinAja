"use client";

import { Eye, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ProductImagePreviewProps = {
  src: string;
  alt: string;
  triggerClassName?: string;
};

export function ProductImagePreview({ src, alt, triggerClassName }: ProductImagePreviewProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <Button
        className={triggerClassName}
        size="icon"
        type="button"
        variant="secondary"
        aria-label="Preview gambar produk"
        onClick={() => setIsOpen(true)}
      >
        <Eye className="h-4 w-4" aria-hidden="true" />
      </Button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative max-h-[90dvh] w-full max-w-3xl overflow-hidden rounded-lg bg-white p-3 shadow-lg">
            <Button
              className="absolute right-3 top-3 z-10 bg-white/90"
              size="icon"
              type="button"
              variant="ghost"
              aria-label="Tutup preview"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className={cn("max-h-[82dvh] w-full rounded-md object-contain")}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
