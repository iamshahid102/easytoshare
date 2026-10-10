import { Router } from "express";
import { ApiError } from "../lib/errors";
import { limitsFor } from "../lib/limits";
import { buildClipState, getOrCreateRoom, touchRoom } from "../services/clip";
import type { StorageAdapter } from "../store";

export function createClipRouter(store: StorageAdapter): Router {
  const router = Router();

  // Mirrors the original /apiv3/clip.php contract.
  router.get("/clip", async (req, res) => {
    const { roomId, ownerId } = req;
    if (!roomId || !ownerId) throw ApiError.badRequest("Room context missing");

    const room = await getOrCreateRoom(store, roomId);
    const touched = await touchRoom(store, room);
    const items = await store.listItems(touched.id);

    res.json(buildClipState(touched, items, ownerId, limitsFor(touched.tier)));
  });

  return router;
}
