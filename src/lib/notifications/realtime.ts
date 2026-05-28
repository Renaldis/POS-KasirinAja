import { createRedisSubscriber, getRedisClient } from "@/lib/redis/client";

function userNotificationVersionKey(storeId: string, userId: string) {
  return `notifications:version:${storeId}:user:${userId}`;
}

function storeNotificationVersionKey(storeId: string) {
  return `notifications:version:${storeId}:store`;
}

function userNotificationChannel(storeId: string, userId: string) {
  return `notifications:channel:${storeId}:user:${userId}`;
}

function storeNotificationChannel(storeId: string) {
  return `notifications:channel:${storeId}:store`;
}

function encodeVersionMessage(version: number) {
  return JSON.stringify({ version });
}

export async function bumpUserNotificationVersion(storeId: string, userId: string) {
  try {
    const client = await getRedisClient();

    if (!client) {
      return;
    }

    const version = await client.incr(userNotificationVersionKey(storeId, userId));
    await client.publish(userNotificationChannel(storeId, userId), encodeVersionMessage(version));
  } catch {
    // Redis is only a realtime signal; database remains the source of truth.
  }
}

export async function bumpStoreNotificationVersion(storeId: string) {
  try {
    const client = await getRedisClient();

    if (!client) {
      return;
    }

    const version = await client.incr(storeNotificationVersionKey(storeId));
    await client.publish(storeNotificationChannel(storeId), encodeVersionMessage(version));
  } catch {
    // Redis is only a realtime signal; database remains the source of truth.
  }
}

export async function getNotificationVersion(storeId: string, userId: string) {
  try {
    const client = await getRedisClient();

    if (!client) {
      return Date.now();
    }

    const [userVersion, storeVersion] = await client.mget(
      userNotificationVersionKey(storeId, userId),
      storeNotificationVersionKey(storeId),
    );

    return Math.max(Number(userVersion ?? 0), Number(storeVersion ?? 0));
  } catch {
    return Date.now();
  }
}

export async function subscribeToNotificationChanges({
  storeId,
  userId,
  onChange,
}: {
  storeId: string;
  userId: string;
  onChange: (version: number) => void;
}) {
  const subscriber = await createRedisSubscriber();

  if (!subscriber) {
    return null;
  }

  const channels = [
    userNotificationChannel(storeId, userId),
    storeNotificationChannel(storeId),
  ];

  subscriber.on("message", (_channel, message) => {
    try {
      const payload = JSON.parse(message) as { version?: unknown };
      const version = Number(payload.version ?? Date.now());

      onChange(Number.isFinite(version) ? version : Date.now());
    } catch {
      onChange(Date.now());
    }
  });

  await subscriber.subscribe(...channels);

  return async () => {
    await subscriber.unsubscribe(...channels);
    subscriber.disconnect();
  };
}
