import { NextResponse, type NextRequest } from "next/server";
import { attachDeviceCookie, resolveRoom } from "@/server/http/context";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { errorResponse } from "@/server/http/respond";
import { limitsFor } from "@/server/limits";
import { getApiStore } from "@/server/runtime";
import { buildClipState, getOrCreateRoom, touchRoom } from "@/server/services/clip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mirrors the original /apiv3/clip.php contract.
export async function GET(request: NextRequest) {
  const context = resolveRoom(request);

  try {
    enforceRateLimit(context.roomId);

    const store = await getApiStore();
    const room = await getOrCreateRoom(store, context.roomId);
    const touched = await touchRoom(store, room);
    const items = await store.listItems(touched.id);

    const state = buildClipState(
      touched,
      items,
      context.ownerId,
      limitsFor(touched.tier),
    );

    return attachDeviceCookie(NextResponse.json(state), context);
  } catch (error) {
    return attachDeviceCookie(errorResponse(error), context);
  }
}
