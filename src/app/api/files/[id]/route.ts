import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/server/errors";
import { attachDeviceCookie, resolveRoom } from "@/server/http/context";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { errorResponse } from "@/server/http/respond";
import { hub } from "@/server/realtime/hub";
import { getApiStore } from "@/server/runtime";
import { getOrCreateRoom, touchRoom } from "@/server/services/clip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface FileRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: FileRouteContext,
): Promise<Response> {
  const context = resolveRoom(request);

  try {
    enforceRateLimit(context.roomId);

    const { id } = await params;
    if (!id) throw ApiError.badRequest("Missing file id", "missing_id");

    const store = await getApiStore();
    const room = await getOrCreateRoom(store, context.roomId);
    const item = await store.getItem(room.id, id);
    if (!item || item.kind !== "file" || !item.storageKey) {
      throw ApiError.notFound("File not found");
    }

    const data = await store.getObject(item.storageKey);
    if (!data) throw ApiError.notFound("File not found");

    await touchRoom(store, room);

    const bytes = new Uint8Array(data.byteLength);
    bytes.set(data);

    const response = new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": item.mime ?? "application/octet-stream",
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(item.name ?? "file")}`,
        "X-Content-Type-Options": "nosniff",
      },
    });

    return attachDeviceCookie(response, context);
  } catch (error) {
    return attachDeviceCookie(errorResponse(error), context);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: FileRouteContext,
): Promise<Response> {
  const context = resolveRoom(request);

  try {
    enforceRateLimit(context.roomId);

    const { id } = await params;
    if (!id) throw ApiError.badRequest("Missing file id", "missing_id");

    const store = await getApiStore();
    const room = await getOrCreateRoom(store, context.roomId);
    const item = await store.getItem(room.id, id);
    if (!item) throw ApiError.notFound("File not found");
    if (item.ownerId !== context.ownerId) {
      throw ApiError.forbidden(
        "You can only delete files you uploaded",
        "not_owner",
      );
    }

    await store.deleteItem(room.id, item.id);
    if (item.storageKey) await store.deleteObject(item.storageKey);
    await touchRoom(store, room);

    hub.publish(room.id, "update", {
      kind: "file",
      itemId: item.id,
      deleted: true,
    });

    return attachDeviceCookie(new NextResponse(null, { status: 204 }), context);
  } catch (error) {
    return attachDeviceCookie(errorResponse(error), context);
  }
}
