import { Router } from "express";
import type { StorageAdapter } from "../store";
import { createClearRouter } from "./clear";
import { createClipRouter } from "./clip";
import { createEventsRouter } from "./events";
import { createFilesRouter } from "./files";
import { createTextRouter } from "./text";

export function createApiRouter(store: StorageAdapter): Router {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      store: store.name,
      uptime: process.uptime(),
    });
  });

  router.use(createClipRouter(store));
  router.use(createTextRouter(store));
  router.use(createFilesRouter(store));
  router.use(createClearRouter(store));
  router.use(createEventsRouter());

  return router;
}
