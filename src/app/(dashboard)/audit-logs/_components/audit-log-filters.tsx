import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AuditUserOption } from '@/app/(dashboard)/audit-logs/_types/audit-log';

type AuditLogFiltersProps = {
  search: string;
  entity?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  users: AuditUserOption[];
};

export function AuditLogFilters({
  search,
  entity,
  userId,
  startDate,
  endDate,
  users,
}: AuditLogFiltersProps) {
  return (
    <form className="grid gap-3 rounded-lg border bg-white p-4 lg:grid-cols-[1fr_160px_220px_150px_150px_auto]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--muted-foreground)" />
        <Input
          name="q"
          defaultValue={search}
          placeholder="Cari action atau entity ID"
          className="pl-9"
        />
      </div>
      <Input name="entity" defaultValue={entity ?? ''} placeholder="Entity" />
      <select
        name="userId"
        defaultValue={userId ?? ''}
        className="h-10 rounded-md border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
      >
        <option value="">Semua user</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>
      <Input name="startDate" type="date" defaultValue={startDate ?? ''} />
      <Input name="endDate" type="date" defaultValue={endDate ?? ''} />
      <Button type="submit">Filter</Button>
    </form>
  );
}
