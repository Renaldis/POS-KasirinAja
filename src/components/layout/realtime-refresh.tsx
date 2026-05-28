"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

type RealtimeRefreshProps = {
  version: number;
};

export function RealtimeRefresh({ version }: RealtimeRefreshProps) {
  const router = useRouter();
  const pathname = usePathname();
  const versionRef = useRef(version);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    versionRef.current = version;
  }, [version]);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let active = true;
    let eventSource: EventSource | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    function shouldRefresh(scopes: string[]) {
      if (scopes.length === 0) {
        return true;
      }

      const currentPathname = pathnameRef.current;
      const pathScopes: Record<string, string[]> = {
        "/dashboard": ["dashboard", "transactions", "payments", "stocks", "products"],
        "/payments": ["payments"],
        "/pos": ["pos", "products", "stocks"],
        "/products": ["products", "stocks"],
        "/stocks": ["stocks", "products"],
        "/transactions": ["transactions", "payments"],
        "/shifts": ["shifts", "transactions"],
      };
      const matchedEntry = Object.entries(pathScopes).find(([path]) =>
        currentPathname === path || currentPathname.startsWith(`${path}/`),
      );

      if (!matchedEntry) {
        return true;
      }

      const [, relevantScopes] = matchedEntry;

      return scopes.some((scope) => relevantScopes.includes(scope));
    }

    async function refreshIfChanged(nextVersion?: number, scopes: string[] = []) {
      if (!active) {
        return;
      }

      if (nextVersion !== undefined && nextVersion <= versionRef.current) {
        return;
      }

      if (nextVersion !== undefined) {
        versionRef.current = nextVersion;

        if (shouldRefresh(scopes)) {
          router.refresh();
        }

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
          scopes?: string[];
          version?: number;
        };

        if (result.changed && typeof result.version === "number") {
          versionRef.current = result.version;

          if (shouldRefresh(result.scopes ?? [])) {
            router.refresh();
          }
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
        const payload = JSON.parse(event.data) as {
          scopes?: unknown;
          version?: unknown;
        };
        const nextVersion = Number(payload.version);
        const scopes = Array.isArray(payload.scopes)
          ? payload.scopes.filter((scope): scope is string => typeof scope === "string")
          : [];

        if (Number.isFinite(nextVersion)) {
          void refreshIfChanged(nextVersion, scopes);
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
