import { NextResponse, type NextRequest } from "next/server";
import { attachDeviceCookie, resolveRoom } from "@/server/http/context";
import { hub, type RealtimeEvent } from "@/server/realtime/hub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 25_000;

/**
 * Server-Sent Events stream. Runs on the Node runtime so the in-process hub
 * can be shared with the mutating routes. `ReadableStream` cancel + the
 * request abort signal both tear the subscription down.
 */
export async function GET(request: NextRequest) {
  const context = resolveRoom(request);
  const encoder = new TextEncoder();

  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let unsubscribe: () => void = () => {};
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (chunk: string): boolean => {
        if (closed) return false;
        try {
          controller.enqueue(encoder.encode(chunk));
          return true;
        } catch {
          teardown();
          return false;
        }
      };

      const write = (event: RealtimeEvent): void => {
        send(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
      };

      function teardown(): void {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        heartbeat = undefined;
        unsubscribe();
      }

      // Subscribe before announcing readiness so no update can slip through.
      unsubscribe = hub.subscribe(context.roomId, write);
      write({ type: "ready", roomId: context.roomId, at: Date.now() });

      heartbeat = setInterval(() => {
        if (!send(": ping\n\n")) teardown();
      }, HEARTBEAT_MS);
      heartbeat.unref?.();

      request.signal.addEventListener("abort", () => {
        teardown();
        try {
          controller.close();
        } catch {
          // Already closed by the client.
        }
      });
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      heartbeat = undefined;
      closed = true;
      unsubscribe();
    },
  });

  const response = new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });

  return attachDeviceCookie(response, context);
}
