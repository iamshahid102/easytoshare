import { NextResponse, type NextRequest } from "next/server";
import { attachDeviceCookie, resolveRoom } from "@/server/http/context";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { errorResponse } from "@/server/http/respond";
import { hub } from "@/server/realtime/hub";
import { getApiStore } from "@/server/runtime";
import { getOrCreateRoom, touchRoom } from "@/server/services/clip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const context = resolveRoom(request);

  try {
    enforceRateLimit(context.roomId);

    const store = await getApiStore();
    const room = await getOrCreateRoom(store, context.roomId);
    const removed = await store.clearItems(room.id);

    await Promise.all(
      removed.map((item) =>
        item.storageKey ? store.deleteObject(item.storageKey) : Promise.resolve(),
      ),
    );

    await touchRoom(store, room);
    hub.publish(room.id, "clear");

    return attachDeviceCookie(new NextResponse(null, { status: 204 }), context);
  } catch (error) {
    return attachDeviceCookie(errorResponse(error), context);
  }
}
