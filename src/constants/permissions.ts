export const permissions = [
  { key: "dashboard.global.read", name: "Read Global Dashboard", module: "dashboard" },
  { key: "dashboard.store.read", name: "Read Store Dashboard", module: "dashboard" },
  { key: "pos.access", name: "Access POS", module: "pos" },
  { key: "pos.transaction.create", name: "Create POS Transaction", module: "pos" },
  { key: "pos.transaction.hold", name: "Hold POS Transaction", module: "pos" },
  { key: "transaction.read.all", name: "Read All Transactions", module: "transaction" },
  { key: "transaction.read.own", name: "Read Own Transactions", module: "transaction" },
  { key: "transaction.void", name: "Void Transaction", module: "transaction" },
  { key: "product.read", name: "Read Products", module: "product" },
  { key: "product.create", name: "Create Product", module: "product" },
  { key: "product.update", name: "Update Product", module: "product" },
  { key: "product.delete", name: "Delete Product", module: "product" },
  { key: "category.manage", name: "Manage Categories", module: "category" },
  { key: "stock.read", name: "Read Stock", module: "stock" },
  { key: "stock.movement.create", name: "Create Stock Movement", module: "stock" },
  { key: "stock.adjustment.create", name: "Create Stock Adjustment", module: "stock" },
  { key: "payment.manual.approve", name: "Approve Manual Payment", module: "payment" },
  { key: "payment.manual.reject", name: "Reject Manual Payment", module: "payment" },
  { key: "report.read", name: "Read Reports", module: "report" },
  { key: "shift.open", name: "Open Shift", module: "shift" },
  { key: "shift.close", name: "Close Shift", module: "shift" },
  { key: "shift.read.all", name: "Read All Shifts", module: "shift" },
  { key: "shift.read.own", name: "Read Own Shifts", module: "shift" },
  { key: "user.manage", name: "Manage Users", module: "user" },
  { key: "role.manage", name: "Manage Roles", module: "role" },
  { key: "setting.store.update", name: "Update Store Settings", module: "setting" },
  { key: "setting.global.update", name: "Update Global Settings", module: "setting" },
] as const;

export type PermissionKey = (typeof permissions)[number]["key"];

export const globalPermissionKeys = [
  "dashboard.global.read",
  "setting.global.update",
] as const satisfies readonly PermissionKey[];

export const defaultRolePermissions = {
  super_admin: permissions.map((permission) => permission.key),
  admin: permissions
    .map((permission) => permission.key)
    .filter((key) => !(globalPermissionKeys as readonly string[]).includes(key)),
  cashier: [
    "pos.access",
    "pos.transaction.create",
    "pos.transaction.hold",
    "transaction.read.own",
    "transaction.void",
    "product.read",
    "stock.read",
    "shift.open",
    "shift.close",
    "shift.read.own",
  ],
} as const satisfies Record<string, readonly PermissionKey[]>;
