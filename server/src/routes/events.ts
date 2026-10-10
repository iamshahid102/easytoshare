import { Router } from "express";
import { ApiError } from "../lib/errors";
import { hub, type RealtimeEvent } from "../realtime/hub";

const HEARTBEAT_MS = 25_000;

export function createEventsRouter(): Router {
  const router = Router();

  router.get("/events", (req, res) => {
    const { roomId } = req;
    if (!roomId) throw ApiError.badRequest("Room context missing");

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const write = (event: RealtimeEvent): void => {
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    // Subscribe before announcing readiness so no update can slip through.
    const unsubscribe = hub.subscribe(roomId, write);
    write({ type: "ready", roomId, at: Date.now() });
    const heartbeat = setInterval(() => {
      res.write(": ping\n\n");
    }, HEARTBEAT_MS);

    req.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
      res.end();
    });
  });

  return router;
}
