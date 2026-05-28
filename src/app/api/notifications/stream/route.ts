import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import {
  getNotificationVersion,
  subscribeToNotificationChanges,
} from "@/lib/notifications/realtime";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: {
      id: currentUser.id,
    },
    select: {
      id: true,
      storeId: true,
    },
  });

  if (!user?.storeId) {
    return NextResponse.json({ message: "Store not found" }, { status: 400 });
  }

  const storeId = user.storeId;
  const encoder = new TextEncoder();
  let cleanup: (() => Promise<void>) | null = null;
  let heartbeatId: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, payload: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`),
        );
      }

      send("notification", {
        version: await getNotificationVersion(storeId, user.id),
      });

      try {
        cleanup = await subscribeToNotificationChanges({
          storeId,
          userId: user.id,
          onChange: (version) => {
            send("notification", { version });
          },
        });
      } catch {
        cleanup = null;
      }

      if (!cleanup) {
        controller.error(new Error("Redis subscriber unavailable"));
        return;
      }

      heartbeatId = setInterval(() => {
        send("ping", { now: Date.now() });
      }, 25000);

      request.signal.addEventListener("abort", async () => {
        if (heartbeatId) {
          clearInterval(heartbeatId);
        }

        await cleanup?.();
      });
    },
    async cancel() {
      if (heartbeatId) {
        clearInterval(heartbeatId);
      }

      await cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
      "X-Accel-Buffering": "no",
    },
  });
}
