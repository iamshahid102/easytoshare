import { Router } from "express";
import { ApiError } from "../lib/errors";
import { hub } from "../realtime/hub";
import { getOrCreateRoom, setRoomText, touchRoom } from "../services/clip";
import type { StorageAdapter } from "../store";
import { textBodySchema } from "../schemas";

export function createTextRouter(store: StorageAdapter): Router {
  const router = Router();

  router.post("/text", async (req, res) => {
    const { roomId, ownerId } = req;
    if (!roomId || !ownerId) throw ApiError.badRequest("Room context missing");

    const parsed = textBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.badRequest(
        parsed.error.issues[0]?.message ?? "Invalid text payload",
        "validation_error",
      );
    }

    const room = await getOrCreateRoom(store, roomId);
    const item = await setRoomText(store, room, parsed.data.text, ownerId);
    const touched = await touchRoom(store, room);

    hub.publish(room.id, "update", { kind: "text" });

    res.json({
      ok: true,
      id: item?.id ?? null,
      expiresAt: touched.expiresAt,
      serverTime: Date.now(),
    });
  });

  return router;
}
