import type { UserRoleOption } from "@/app/(dashboard)/users/_types/user";

export function dedupeRoleOptions(
  roles: UserRoleOption[],
  selectedRoleId?: string | null,
) {
  const optionsByName = new Map<string, UserRoleOption>();

  for (const role of roles) {
    const existingRole = optionsByName.get(role.name);

    if (!existingRole) {
      optionsByName.set(role.name, role);
      continue;
    }

    if (role.id === selectedRoleId) {
      optionsByName.set(role.name, role);
      continue;
    }

    if (existingRole.id === selectedRoleId) {
      continue;
    }

    if (!existingRole.storeId && role.storeId) {
      optionsByName.set(role.name, role);
    }
  }

  return [...optionsByName.values()].sort((firstRole, secondRole) =>
    firstRole.name.localeCompare(secondRole.name, "id"),
  );
}
