import type { PermissionKey } from "@/constants/permissions";
import { prisma } from "@/lib/prisma";

export const notificationPreferenceDefinitions = [
  {
    key: "stock.low",
    label: "Stok produk menipis",
    description: "Dikirim saat stok produk berada di bawah atau sama dengan minimum.",
    allowedPermissionKeys: ["stock.read", "stock.adjustment.create"] as const,
    defaultPermissionKeys: ["stock.read", "stock.adjustment.create"] as const,
  },
  {
    key: "payment.manual.pending",
    label: "Transfer manual menunggu approval",
    description: "Dikirim saat kasir membuat transaksi transfer manual pending.",
    allowedPermissionKeys: ["payment.manual.approve", "payment.manual.reject"] as const,
    defaultPermissionKeys: ["payment.manual.approve"] as const,
  },
] as const;

export type NotificationPreferenceKey =
  (typeof notificationPreferenceDefinitions)[number]["key"];

export type NotificationPreferences = Record<
  NotificationPreferenceKey,
  {
    enabled: boolean;
    permissionKeys: PermissionKey[];
  }
>;

type RawNotificationPreference = {
  enabled?: unknown;
  permissionKeys?: unknown;
};

export function getDefaultNotificationPreferences(): NotificationPreferences {
  return Object.fromEntries(
    notificationPreferenceDefinitions.map((definition) => [
      definition.key,
      {
        enabled: true,
        permissionKeys: [...definition.defaultPermissionKeys],
      },
    ]),
  ) as NotificationPreferences;
}

export function normalizeNotificationPreferences(input: unknown): NotificationPreferences {
  const defaults = getDefaultNotificationPreferences();
  const rawPreferences =
    input && typeof input === "object"
      ? (input as Partial<Record<NotificationPreferenceKey, RawNotificationPreference>>)
      : {};

  return Object.fromEntries(
    notificationPreferenceDefinitions.map((definition) => {
      const rawPreference = rawPreferences[definition.key];
      const allowedPermissionKeys = new Set<PermissionKey>(
        definition.allowedPermissionKeys,
      );
      const permissionKeys = Array.isArray(rawPreference?.permissionKeys)
        ? rawPreference.permissionKeys.filter(
            (permissionKey): permissionKey is PermissionKey =>
              typeof permissionKey === "string" &&
              allowedPermissionKeys.has(permissionKey as PermissionKey),
          )
        : defaults[definition.key].permissionKeys;

      return [
        definition.key,
        {
          enabled:
            typeof rawPreference?.enabled === "boolean"
              ? rawPreference.enabled
              : defaults[definition.key].enabled,
          permissionKeys,
        },
      ];
    }),
  ) as NotificationPreferences;
}

export async function getStoreNotificationPreferences(storeId: string) {
  const store = await prisma.store.findUnique({
    where: {
      id: storeId,
    },
    select: {
      notificationPreferences: true,
    },
  });

  return normalizeNotificationPreferences(store?.notificationPreferences);
}
