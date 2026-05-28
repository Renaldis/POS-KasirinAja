"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

type RealtimeRefreshProps = {
  version: number;
};

export function RealtimeRefresh({ version }: RealtimeRefreshProps) {
  const router = useRouter();
  const versionRef = useRef(version);

  useEffect(() => {
    versionRef.current = version;
  }, [version]);

  useEffect(() => {
    let active = true;
    let eventSource: EventSource | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function refreshIfChanged(nextVersion?: number) {
      if (!active) {
        return;
      }

      if (nextVersion !== undefined && nextVersion <= versionRef.current) {
        return;
      }

      if (nextVersion !== undefined) {
        versionRef.current = nextVersion;
        router.refresh();
        return;
      }

      try {
        const response = await fetch(`/api/realtime?version=${versionRef.current}`, {
          cache: "no-store",
        });

        if (!active || !response.ok) {
          return;
        }

        const result = (await response.json()) as {
          changed?: boolean;
          version?: number;
        };

        if (result.changed && typeof result.version === "number") {
          versionRef.current = result.version;
          router.refresh();
        }
      } catch {
        // Polling is a fallback when the Redis SSE stream is unavailable.
      }
    }

    function startPolling() {
      if (intervalId) {
        return;
      }

      intervalId = setInterval(() => {
        void refreshIfChanged();
      }, 5000);
    }

    if ("EventSource" in window) {
      eventSource = new EventSource("/api/realtime/stream");
      eventSource.addEventListener("change", (event) => {
        const payload = JSON.parse(event.data) as { version?: unknown };
        const nextVersion = Number(payload.version);

        if (Number.isFinite(nextVersion)) {
          void refreshIfChanged(nextVersion);
        }
      });
      eventSource.onerror = () => {
        eventSource?.close();
        eventSource = null;
        startPolling();
      };
    } else {
      startPolling();
    }

    return () => {
      active = false;
      eventSource?.close();

      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [router]);

  return null;
}
