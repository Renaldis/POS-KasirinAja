'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Boxes,
  Clock3,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Package,
  ReceiptText,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navigation = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    permissions: ['dashboard.store.read', 'dashboard.global.read'],
  },
  { label: 'POS Kasir', href: '/pos', icon: ShoppingCart, permissions: ['pos.access'] },
  {
    label: 'Shift Kasir',
    href: '/shifts',
    icon: Clock3,
    permissions: ['shift.read.own', 'shift.read.all', 'shift.open', 'shift.close'],
  },
  { label: 'Produk', href: '/products', icon: Package, permissions: ['product.read'] },
  { label: 'Stok', href: '/stocks', icon: Boxes, permissions: ['stock.read'] },
  {
    label: 'Transaksi',
    href: '/transactions',
    icon: ReceiptText,
    permissions: ['transaction.read.own', 'transaction.read.all'],
  },
  {
    label: 'Pembayaran',
    href: '/payments',
    icon: CreditCard,
    permissions: ['payment.manual.approve', 'payment.manual.reject'],
  },
  { label: 'Laporan', href: '/reports', icon: BarChart3, permissions: ['report.read'] },
  { label: 'User', href: '/users', icon: Users, permissions: ['user.manage'] },
  { label: 'Role', href: '/roles', icon: ShieldCheck, permissions: ['role.manage'] },
  { label: 'Audit', href: '/audit-logs', icon: ClipboardList, permissions: ['audit.read'] },
  {
    label: 'Setting',
    href: '/settings',
    icon: Settings,
    permissions: ['setting.store.update', 'setting.global.update'],
  },
];

type DashboardSidebarProps = {
  open: boolean;
  permissionKeys: string[];
  onOpenChange: (open: boolean) => void;
};

export function DashboardSidebar({
  open,
  permissionKeys,
  onOpenChange,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const permissionSet = new Set(permissionKeys);
  const visibleNavigation = navigation.filter((item) =>
    item.permissions.some((permission) => permissionSet.has(permission)),
  );

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
        {visibleNavigation.map((item) => (
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
