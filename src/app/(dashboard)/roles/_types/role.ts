export type PermissionOption = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  module: string;
};

export type PermissionGroup = {
  module: string;
  permissions: PermissionOption[];
};

export type RoleListItem = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isGlobal: boolean;
  userCount: number;
  permissionCount: number;
  createdAt: Date;
};

export type RoleFormValue = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissionIds: string[];
};

export type RoleActionState = {
  success: boolean;
  message?: string;
};
