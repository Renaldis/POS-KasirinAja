"use client";

import { Bell, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DashboardHeaderProps = {
  onMenuClick: () => void;
};

export function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Button
          className="lg:hidden"
          size="icon"
          variant="ghost"
          aria-label="Buka menu"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
        <div className="relative hidden w-full max-w-md sm:block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]"
            aria-hidden="true"
          />
          <Input className="pl-9" placeholder="Cari transaksi, produk, atau invoice" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button size="icon" variant="ghost" aria-label="Notifikasi">
            <Bell className="h-5 w-5" aria-hidden="true" />
          </Button>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium">Admin Warung</p>
            <p className="text-xs text-[var(--muted-foreground)]">Demo Store</p>
          </div>
        </div>
      </div>
    </header>
  );
}
