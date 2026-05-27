"use client";

import { useEffect, useState } from "react";
import { ProductImagePreview } from "@/app/(dashboard)/products/_components/product-image-preview";
import { Input } from "@/components/ui/input";

type ProductImageInputPreviewProps = {
  id: string;
  disabled?: boolean;
  currentImageUrl?: string | null;
  productName?: string;
};

export function ProductImageInputPreview({
  id,
  disabled,
  currentImageUrl,
  productName = "Foto produk",
}: ProductImageInputPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl ?? null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      setObjectUrl(null);
    }

    if (!file) {
      setPreviewUrl(currentImageUrl ?? null);
      return;
    }

    const nextObjectUrl = URL.createObjectURL(file);
    setObjectUrl(nextObjectUrl);
    setPreviewUrl(nextObjectUrl);
  }

  return (
    <div className="space-y-3">
      <Input
        id={id}
        name="image"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled}
        onChange={handleChange}
      />
      {previewUrl ? (
        <div className="flex items-center gap-3 rounded-md border bg-[var(--muted)] p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={productName}
            className="h-16 w-16 rounded-md border bg-white object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">Preview foto produk</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              JPG, PNG, atau WebP. Maksimal 2 MB.
            </p>
          </div>
          <ProductImagePreview src={previewUrl} alt={productName} />
        </div>
      ) : (
        <p className="text-xs text-[var(--muted-foreground)]">
          JPG, PNG, atau WebP. Maksimal 2 MB.
        </p>
      )}
    </div>
  );
}
