import Link from "next/link";
import {
  BarChart3,
  Boxes,
  CreditCard,
  LayoutDashboard,
  Package,
  ReceiptText,
  Settings,
  ShoppingCart,
  Users,
  WalletCards,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "POS Kasir", href: "/pos", icon: ShoppingCart },
  { label: "Produk", href: "/products", icon: Package },
  { label: "Stok", href: "/stocks", icon: Boxes },
  { label: "Transaksi", href: "/transactions", icon: ReceiptText },
  { label: "Pembayaran", href: "/payments", icon: CreditCard },
  { label: "Laporan", href: "/reports", icon: BarChart3 },
  { label: "User & Role", href: "/users", icon: Users },
  { label: "Setting", href: "/settings", icon: Settings },
];

export function DashboardSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-white lg:block">
      <div className="flex h-16 items-center gap-2 border-b px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--primary)] text-white">
          <WalletCards className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold">KasirinAja</p>
          <p className="text-xs text-[var(--muted-foreground)]">POS Warung</p>
        </div>
      </div>
      <nav className="space-y-1 px-3 py-4">
        {navigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
              item.href === "/dashboard" && "bg-[var(--muted)] text-[var(--foreground)]",
            )}
          >
            <item.icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
