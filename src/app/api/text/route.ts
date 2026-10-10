import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/server/errors";
import { attachDeviceCookie, resolveRoom } from "@/server/http/context";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { errorResponse, readJsonBody } from "@/server/http/respond";
import { hub } from "@/server/realtime/hub";
import { getApiStore } from "@/server/runtime";
import { textBodySchema } from "@/server/schemas";
import { getOrCreateRoom, setRoomText, touchRoom } from "@/server/services/clip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const context = resolveRoom(request);

  try {
    enforceRateLimit(context.roomId);

    const parsed = textBodySchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      throw ApiError.badRequest(
        parsed.error.issues[0]?.message ?? "Invalid text payload",
        "validation_error",
      );
    }

    const store = await getApiStore();
    const room = await getOrCreateRoom(store, context.roomId);
    const item = await setRoomText(store, room, parsed.data.text, context.ownerId);
    const touched = await touchRoom(store, room);

    hub.publish(room.id, "update", { kind: "text" });

    const response = NextResponse.json({
      ok: true,
      id: item?.id ?? null,
      expiresAt: touched.expiresAt,
      serverTime: Date.now(),
    });

    return attachDeviceCookie(response, context);
  } catch (error) {
    return attachDeviceCookie(errorResponse(error), context);
  }
}
