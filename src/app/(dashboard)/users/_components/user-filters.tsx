import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type UserFiltersProps = {
  search: string;
  status?: string;
  roleId?: string;
  roles: {
    id: string;
    name: string;
  }[];
};

export function UserFilters({
  search,
  status,
  roleId,
  roles,
}: UserFiltersProps) {
  return (
    <form className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-[1fr_180px_220px_auto]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--muted-foreground)" />
        <Input
          name="q"
          defaultValue={search}
          placeholder="Cari nama atau email"
          className="pl-9"
        />
      </div>
      <select
        name="status"
        defaultValue={status ?? ''}
        className="h-10 rounded-md border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
      >
        <option value="">Semua status</option>
        <option value="active">Aktif</option>
        <option value="inactive">Nonaktif</option>
      </select>
      <select
        name="roleId"
        defaultValue={roleId ?? ''}
        className="h-10 rounded-md border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
      >
        <option value="">Semua role</option>
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.name}
          </option>
        ))}
      </select>
      <Button type="submit">Filter</Button>
    </form>
  );
}
