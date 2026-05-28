import type { AuditLogListItem } from '@/app/(dashboard)/audit-logs/_types/audit-log';
import { Badge } from '@/components/ui/badge';

type AuditLogListProps = {
  logs: AuditLogListItem[];
};

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatMetadata(metadata: AuditLogListItem['metadata']) {
  if (metadata === null) {
    return '{}';
  }

  return JSON.stringify(metadata, null, 2);
}

function getModuleFromAction(action: string) {
  return action.split('.')[0] ?? action;
}

export function AuditLogList({ logs }: AuditLogListProps) {
  if (logs.length === 0) {
    return (
      <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed bg-white p-6 text-center">
        <div>
          <h2 className="text-base font-semibold">Belum ada audit log</h2>
          <p className="mt-1 text-sm text-(--muted-foreground)">
            Aktivitas penting akan tampil di sini setelah ada perubahan data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="hidden grid-cols-[1fr_0.8fr_1fr_0.9fr] gap-3 border-b bg-(--muted) px-4 py-3 text-sm font-medium text-(--muted-foreground) xl:grid">
        <span>Aktivitas</span>
        <span>Entity</span>
        <span>User</span>
        <span>Waktu</span>
      </div>
      <div className="divide-y">
        {logs.map((log) => (
          <div key={log.id} className="px-4 py-4">
            <div className="grid gap-3 xl:grid-cols-[1fr_0.8fr_1fr_0.9fr] xl:items-start">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {getModuleFromAction(log.action)}
                  </Badge>
                  <p className="truncate text-sm font-medium">{log.action}</p>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm">{log.entity}</p>
                {log.entityId ? (
                  <p className="mt-0.5 truncate text-xs text-(--muted-foreground)">
                    {log.entityId}
                  </p>
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm">{log.userName ?? 'System'}</p>
                {log.userEmail ? (
                  <p className="mt-0.5 truncate text-xs text-(--muted-foreground)">
                    {log.userEmail}
                  </p>
                ) : null}
              </div>
              <p className="text-sm text-(--muted-foreground)">
                {dateFormatter.format(log.createdAt)}
              </p>
            </div>
            <details className="mt-3 rounded-md border bg-(--muted) px-3 py-2">
              <summary className="cursor-pointer text-sm font-medium">
                Metadata
              </summary>
              <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap wrap-break-word text-xs text-(--muted-foreground)">
                {formatMetadata(log.metadata)}
              </pre>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}
