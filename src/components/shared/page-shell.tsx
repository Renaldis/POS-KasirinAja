import { Breadcrumbs, type BreadcrumbItem } from "@/components/shared/breadcrumbs";

type PageShellProps = {
  title: string;
  description?: string;
  breadcrumbs: BreadcrumbItem[];
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export function PageShell({ title, description, breadcrumbs, actions, children }: PageShellProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Breadcrumbs items={breadcrumbs} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
            {description ? (
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </div>
      </div>
      {children}
    </div>
  );
}
