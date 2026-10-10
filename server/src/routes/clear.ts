import { Router } from "express";
import { ApiError } from "../lib/errors";
import { hub } from "../realtime/hub";
import { getOrCreateRoom, touchRoom } from "../services/clip";
import type { StorageAdapter } from "../store";

export function createClearRouter(store: StorageAdapter): Router {
  const router = Router();

  router.post("/clear", async (req, res) => {
    const { roomId } = req;
    if (!roomId) throw ApiError.badRequest("Room context missing");

    const room = await getOrCreateRoom(store, roomId);
    const removed = await store.clearItems(room.id);

    await Promise.all(
      removed.map((item) =>
        item.storageKey ? store.deleteObject(item.storageKey) : Promise.resolve(),
      ),
    );

    await touchRoom(store, room);
    hub.publish(room.id, "clear");

    res.status(204).end();
  });

  return router;
}
