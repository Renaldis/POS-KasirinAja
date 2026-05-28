import type { UserStatus } from "@/generated/prisma/client";

export type UserRoleOption = {
  id: string;
  storeId: string | null;
  name: string;
  description: string | null;
  isSystem: boolean;
};

export type UserListItem = {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  roleName: string | null;
  roleDescription: string | null;
  createdAt: Date;
  isCurrentUser: boolean;
};

export type UserFormValue = {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  roleId: string | null;
};

export type UserActionState = {
  success: boolean;
  message?: string;
};
