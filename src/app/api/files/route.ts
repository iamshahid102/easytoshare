import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/server/errors";
import { attachDeviceCookie, resolveRoom } from "@/server/http/context";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { errorResponse } from "@/server/http/respond";
import { newId, safeFileName } from "@/server/ids";
import { isAllowedMime, limitsFor } from "@/server/limits";
import { hub } from "@/server/realtime/hub";
import { getApiStore } from "@/server/runtime";
import { getOrCreateRoom, toFileDto, touchRoom } from "@/server/services/clip";
import type { ClipItem } from "@/server/store/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Narrows a multipart entry to an uploaded file. */
function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "size" in value &&
    typeof (value as { size: unknown }).size === "number" &&
    "arrayBuffer" in value
  );
}

export async function POST(request: NextRequest) {
  const context = resolveRoom(request);

  try {
    enforceRateLimit(context.roomId);

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      throw ApiError.badRequest(
        "Expected multipart/form-data",
        "bad_content_type",
      );
    }

    const form = await request.formData();
    const uploaded = form.get("file");
    if (!isUploadedFile(uploaded)) {
      throw ApiError.badRequest("No file uploaded", "no_file");
    }

    const store = await getApiStore();
    const room = await getOrCreateRoom(store, context.roomId);
    const limits = limitsFor(room.tier);

    // Size is validated before the quota so an oversized upload is always
    // reported as 413, matching the multipart parser's old behaviour.
    if (uploaded.size > limits.maxFileSizeMb * 1024 * 1024) {
      throw ApiError.payloadTooLarge(
        `Max ${limits.maxFileSizeMb}Mb`,
        "max_size_reached",
      );
    }

    const existing = (await store.listItems(room.id)).filter(
      (item) => item.kind === "file",
    );
    if (existing.length >= limits.maxFiles) {
      throw ApiError.conflict(
        `Max ${limits.maxFiles} files`,
        "max_files_reached",
      );
    }

    const mime = uploaded.type || "application/octet-stream";
    if (!isAllowedMime(mime)) {
      throw ApiError.badRequest("File type not allowed", "mime_not_allowed");
    }

    const id = newId();
    const storageKey = `${room.id}/${id}`;
    await store.putObject(storageKey, Buffer.from(await uploaded.arrayBuffer()));

    const item: ClipItem = {
      id,
      roomId: room.id,
      kind: "file",
      name: safeFileName(uploaded.name),
      mime,
      size: uploaded.size,
      storageKey,
      ownerId: context.ownerId,
      createdAt: Date.now(),
    };
    await store.putItem(item);

    const touched = await touchRoom(store, room);
    hub.publish(room.id, "update", { kind: "file", itemId: id });

    const response = NextResponse.json(
      {
        file: toFileDto(item, context.ownerId),
        expiresAt: touched.expiresAt,
      },
      { status: 201 },
    );

    return attachDeviceCookie(response, context);
  } catch (error) {
    return attachDeviceCookie(errorResponse(error), context);
  }
}
