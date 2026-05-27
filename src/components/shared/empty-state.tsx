import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
};

export function EmptyState({ title, description, actionLabel }: EmptyStateProps) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed bg-white p-6 text-center">
      <h2 className="text-base font-semibold">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-md text-sm text-[var(--muted-foreground)]">{description}</p>
      ) : null}
      {actionLabel ? <Button className="mt-4">{actionLabel}</Button> : null}
    </div>
  );
}
