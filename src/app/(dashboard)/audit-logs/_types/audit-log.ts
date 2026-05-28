import type { Prisma } from "@/generated/prisma/client";

export type AuditLogListItem = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  userName: string | null;
  userEmail: string | null;
};

export type AuditUserOption = {
  id: string;
  name: string;
  email: string;
};
