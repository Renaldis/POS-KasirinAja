'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Boxes,
  Clock3,
  CreditCard,
  LayoutDashboard,
  Package,
  ReceiptText,
  Settings,
  ShoppingCart,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navigation = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'POS Kasir', href: '/pos', icon: ShoppingCart },
  { label: 'Shift Kasir', href: '/shifts', icon: Clock3 },
  { label: 'Produk', href: '/products', icon: Package },
  { label: 'Stok', href: '/stocks', icon: Boxes },
  { label: 'Transaksi', href: '/transactions', icon: ReceiptText },
  { label: 'Pembayaran', href: '/payments', icon: CreditCard },
  { label: 'Laporan', href: '/reports', icon: BarChart3 },
  { label: 'User & Role', href: '/users', icon: Users },
  { label: 'Setting', href: '/settings', icon: Settings },
];

type DashboardSidebarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DashboardSidebar({
  open,
  onOpenChange,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const sidebarContent = (
    <>
      <div className="flex h-16 items-center gap-2 border-b px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-(--primary) text-white">
          <WalletCards className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold">KasirinAja</p>
          <p className="text-xs text-(--muted-foreground)">POS Warung</p>
        </div>
        <Button
          className="ml-auto lg:hidden"
          size="icon"
          type="button"
          variant="ghost"
          aria-label="Tutup menu"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>
      <nav className="space-y-1 px-3 py-4">
        {navigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? 'page' : undefined}
            onClick={() => onOpenChange(false)}
            className={cn(
              'flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-(--muted-foreground) transition-colors hover:bg-(--muted) hover:text-(--foreground)',
              isActive(item.href) && 'bg-(--muted) text-(--foreground)',
            )}
          >
            <item.icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-white lg:block">
        {sidebarContent}
      </aside>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/35"
            aria-label="Tutup menu"
            onClick={() => onOpenChange(false)}
          />
          <aside className="relative h-full w-72 max-w-[85vw] border-r bg-white shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      ) : null}
    </>
  );
}
