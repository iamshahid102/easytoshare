export interface RealtimeEvent {
  type: "ready" | "update" | "clear";
  roomId: string;
  at: number;
  data?: unknown;
}

type Listener = (event: RealtimeEvent) => void;

/**
 * In-process room fan-out for SSE.
 *
 * Extension point: to scale across multiple instances, mirror `publish`
 * into Redis Pub/Sub and re-`emit` received messages on each instance.
 */
class Hub {
  private readonly channels = new Map<string, Set<Listener>>();

  subscribe(roomId: string, listener: Listener): () => void {
    let listeners = this.channels.get(roomId);
    if (!listeners) {
      listeners = new Set<Listener>();
      this.channels.set(roomId, listeners);
    }
    listeners.add(listener);

    return () => {
      const current = this.channels.get(roomId);
      if (!current) return;
      current.delete(listener);
      if (current.size === 0) this.channels.delete(roomId);
    };
  }

  publish(roomId: string, type: RealtimeEvent["type"], data?: unknown): void {
    const listeners = this.channels.get(roomId);
    if (!listeners) return;
    const event: RealtimeEvent = {
      type,
      roomId,
      at: Date.now(),
      ...(data !== undefined ? { data } : {}),
    };
    for (const listener of listeners) {
      try {
        listener(event);
      } catch {
        // A broken stream must never break the publish loop.
      }
    }
  }

  count(roomId: string): number {
    return this.channels.get(roomId)?.size ?? 0;
  }
}

/**
 * Next.js re-evaluates modules on hot reload in development. Caching the hub
 * on `globalThis` keeps publishers and subscribers on one instance.
 */
const globalForHub = globalThis as typeof globalThis & {
  __airforshareHub?: Hub;
};

export const hub = globalForHub.__airforshareHub ?? new Hub();
globalForHub.__airforshareHub ??= hub;
