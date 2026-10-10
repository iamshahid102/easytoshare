import { Router } from "express";
import multer from "multer";
import { config } from "../config";
import { ApiError } from "../lib/errors";
import { newId, safeFileName } from "../lib/ids";
import { isAllowedMime, limitsFor } from "../lib/limits";
import { hub } from "../realtime/hub";
import { getOrCreateRoom, toFileDto, touchRoom } from "../services/clip";
import type { StorageAdapter } from "../store";
import type { ClipItem } from "../store/types";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxFileSizeMb * 1024 * 1024, files: 1 },
});

export function createFilesRouter(store: StorageAdapter): Router {
  const router = Router();

  router.post("/files", upload.single("file"), async (req, res) => {
    const { roomId, ownerId } = req;
    if (!roomId || !ownerId) throw ApiError.badRequest("Room context missing");

    const file = req.file;
    if (!file) throw ApiError.badRequest("No file uploaded", "no_file");

    const room = await getOrCreateRoom(store, roomId);
    const limits = limitsFor(room.tier);

    const existing = (await store.listItems(room.id)).filter(
      (item) => item.kind === "file",
    );
    if (existing.length >= limits.maxFiles) {
      throw ApiError.conflict(
        `Max ${limits.maxFiles} files`,
        "max_files_reached",
      );
    }
    if (file.size > limits.maxFileSizeMb * 1024 * 1024) {
      throw ApiError.payloadTooLarge(`Max ${limits.maxFileSizeMb}Mb`, "max_size_reached");
    }
    if (!isAllowedMime(file.mimetype)) {
      throw ApiError.badRequest("File type not allowed", "mime_not_allowed");
    }

    const id = newId();
    const storageKey = `${room.id}/${id}`;
    await store.putObject(storageKey, file.buffer);

    const item: ClipItem = {
      id,
      roomId: room.id,
      kind: "file",
      name: safeFileName(file.originalname),
      mime: file.mimetype || "application/octet-stream",
      size: file.size,
      storageKey,
      ownerId,
      createdAt: Date.now(),
    };
    await store.putItem(item);

    const touched = await touchRoom(store, room);
    hub.publish(room.id, "update", { kind: "file", itemId: id });

    res.status(201).json({
      file: toFileDto(item, ownerId),
      expiresAt: touched.expiresAt,
    });
  });

  router.get("/files/:id", async (req, res) => {
    const { roomId, ownerId } = req;
    const itemId = req.params.id;
    if (!roomId || !ownerId || !itemId) {
      throw ApiError.badRequest("Missing file id", "missing_id");
    }

    const room = await getOrCreateRoom(store, roomId);
    const item = await store.getItem(room.id, itemId);
    if (!item || item.kind !== "file" || !item.storageKey) {
      throw ApiError.notFound("File not found");
    }

    const data = await store.getObject(item.storageKey);
    if (!data) throw ApiError.notFound("File not found");

    await touchRoom(store, room);

    const name = item.name ?? "file";
    res.setHeader("Content-Type", item.mime ?? "application/octet-stream");
    res.setHeader("Content-Length", String(data.length));
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.end(data);
  });

  router.delete("/files/:id", async (req, res) => {
    const { roomId, ownerId } = req;
    const itemId = req.params.id;
    if (!roomId || !ownerId || !itemId) {
      throw ApiError.badRequest("Missing file id", "missing_id");
    }

    const room = await getOrCreateRoom(store, roomId);
    const item = await store.getItem(room.id, itemId);
    if (!item) throw ApiError.notFound("File not found");
    if (item.ownerId !== ownerId) {
      throw ApiError.forbidden("You can only delete files you uploaded", "not_owner");
    }

    await store.deleteItem(room.id, item.id);
    if (item.storageKey) await store.deleteObject(item.storageKey);
    await touchRoom(store, room);

    hub.publish(room.id, "update", { kind: "file", itemId: item.id, deleted: true });

    res.status(204).end();
  });

  return router;
}
