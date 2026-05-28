import type {
  PermissionGroup,
  PermissionOption,
} from "@/app/(dashboard)/roles/_types/role";

const moduleOrder = [
  "dashboard",
  "pos",
  "shift",
  "transaction",
  "payment",
  "product",
  "category",
  "stock",
  "report",
  "user",
  "role",
  "audit",
  "setting",
];

export const moduleLabels: Record<string, string> = {
  dashboard: "Dashboard",
  pos: "POS",
  shift: "Shift",
  transaction: "Transaksi",
  payment: "Pembayaran",
  product: "Produk",
  category: "Kategori",
  stock: "Stok",
  report: "Laporan",
  user: "User",
  role: "Role",
  audit: "Audit",
  setting: "Setting",
};

export function groupPermissionsByModule(permissions: PermissionOption[]): PermissionGroup[] {
  const permissionsByModule = new Map<string, PermissionOption[]>();

  for (const permission of permissions) {
    const group = permissionsByModule.get(permission.module) ?? [];
    group.push(permission);
    permissionsByModule.set(permission.module, group);
  }

  return [...permissionsByModule.entries()]
    .sort(([firstModule], [secondModule]) => {
      const firstIndex = moduleOrder.indexOf(firstModule);
      const secondIndex = moduleOrder.indexOf(secondModule);

      if (firstIndex === -1 && secondIndex === -1) {
        return firstModule.localeCompare(secondModule, "id");
      }

      if (firstIndex === -1) {
        return 1;
      }

      if (secondIndex === -1) {
        return -1;
      }

      return firstIndex - secondIndex;
    })
    .map(([module, modulePermissions]) => ({
      module,
      permissions: modulePermissions.sort((firstPermission, secondPermission) =>
        firstPermission.key.localeCompare(secondPermission.key, "id"),
      ),
    }));
}
