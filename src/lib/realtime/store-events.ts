import { createRedisSubscriber, getRedisClient } from "@/lib/redis/client";

function storeRealtimeVersionKey(storeId: string) {
  return `realtime:version:${storeId}`;
}

function storeRealtimePayloadKey(storeId: string) {
  return `realtime:payload:${storeId}`;
}

function storeRealtimeChannel(storeId: string) {
  return `realtime:channel:${storeId}`;
}

export async function bumpStoreRealtimeVersion(storeId: string, scopes: string[] = []) {
  try {
    const client = await getRedisClient();

    if (!client) {
      return;
    }

    const version = await client.incr(storeRealtimeVersionKey(storeId));
    const payload = {
      scopes,
      version,
    };

    await client.set(storeRealtimePayloadKey(storeId), JSON.stringify(payload), "EX", 60);

    await client.publish(storeRealtimeChannel(storeId), JSON.stringify(payload));
  } catch {
    // Realtime refresh is an enhancement; database + revalidation remain canonical.
  }
}

export async function getStoreRealtimeVersion(storeId: string) {
  try {
    const client = await getRedisClient();

    if (!client) {
      return 0;
    }

    const version = await client.get(storeRealtimeVersionKey(storeId));

    return Number(version ?? 0);
  } catch {
    return 0;
  }
}

export async function getStoreRealtimePayload(storeId: string) {
  try {
    const client = await getRedisClient();

    if (!client) {
      return {
        scopes: [],
        version: 0,
      };
    }

    const [version, payload] = await Promise.all([
      client.get(storeRealtimeVersionKey(storeId)),
      client.get(storeRealtimePayloadKey(storeId)),
    ]);
    const parsedPayload = payload
      ? (JSON.parse(payload) as { scopes?: unknown; version?: unknown })
      : null;

    return {
      scopes: Array.isArray(parsedPayload?.scopes)
        ? parsedPayload.scopes.filter((scope): scope is string => typeof scope === "string")
        : [],
      version: Number(version ?? parsedPayload?.version ?? 0),
    };
  } catch {
    return {
      scopes: [],
      version: 0,
    };
  }
}

export async function subscribeToStoreRealtimeChanges({
  storeId,
  onChange,
}: {
  storeId: string;
  onChange: (payload: { scopes: string[]; version: number }) => void;
}) {
  const subscriber = await createRedisSubscriber();

  if (!subscriber) {
    return null;
  }

  const channel = storeRealtimeChannel(storeId);

  subscriber.on("message", (_channel, message) => {
    try {
      const payload = JSON.parse(message) as {
        scopes?: unknown;
        version?: unknown;
      };
      const version = Number(payload.version ?? Date.now());

      onChange({
        scopes: Array.isArray(payload.scopes)
          ? payload.scopes.filter((scope): scope is string => typeof scope === "string")
          : [],
        version: Number.isFinite(version) ? version : Date.now(),
      });
    } catch {
      onChange({
        scopes: [],
        version: Date.now(),
      });
    }
  });

  await subscriber.subscribe(channel);

  return async () => {
    await subscriber.unsubscribe(channel);
    subscriber.disconnect();
  };
}
