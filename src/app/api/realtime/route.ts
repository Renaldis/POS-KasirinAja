import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { getStoreRealtimeVersion } from "@/lib/realtime/store-events";

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
      storeId: true,
    },
  });

  if (!user?.storeId) {
    return NextResponse.json({ message: "Store not found" }, { status: 400 });
  }

  const url = new URL(request.url);
  const clientVersion = Number(url.searchParams.get("version") ?? 0);
  const version = await getStoreRealtimeVersion(user.storeId);

  return NextResponse.json({
    changed: clientVersion !== version,
    version,
  });
}
