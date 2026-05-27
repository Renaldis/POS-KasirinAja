import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-[var(--muted-foreground)]">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
            {item.href && !isLast ? (
              <Link className="truncate transition-colors hover:text-[var(--foreground)]" href={item.href}>
                {item.label}
              </Link>
            ) : (
              <span className="truncate text-[var(--foreground)]">{item.label}</span>
            )}
            {!isLast ? <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
          </span>
        );
      })}
    </nav>
  );
}
