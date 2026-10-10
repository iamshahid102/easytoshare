import { config } from "@/server/config";
import { createStore } from "@/server/store";
import type { StorageAdapter } from "@/server/store/types";

interface Runtime {
  store?: Promise<StorageAdapter>;
  sweeper?: ReturnType<typeof setInterval>;
  sweeperStarted?: boolean;
}

/**
 * The API now runs inside the Next.js server process. Module state can be
 * re-evaluated on hot reload, so the store promise and the sweeper live on
 * `globalThis` and are created exactly once per process.
 */
const globalForRuntime = globalThis as typeof globalThis & {
  __airforshareRuntime?: Runtime;
};

const runtime: Runtime = (globalForRuntime.__airforshareRuntime ??= {});

export function getStore(): Promise<StorageAdapter> {
  runtime.store ??= createStore();
  return runtime.store;
}

/** Starts the sliding-expiry sweeper once per process (idempotent). */
export function startSweeper(): void {
  if (runtime.sweeperStarted) return;
  runtime.sweeperStarted = true;

  const sweeper = setInterval(() => {
    void getStore()
      .then((store) => store.sweepExpired(Date.now()))
      .then((count) => {
        if (count > 0) {
          console.log(`[airforshare] swept ${count} expired room(s)`);
        }
      })
      .catch((error) => console.error("[airforshare] sweep failed", error));
  }, config.sweepIntervalMs);

  // Never keep a process alive just for the sweeper.
  sweeper.unref?.();
  runtime.sweeper = sweeper;
}

/** Shared bootstrap used by every API route before it touches the store. */
export async function getApiStore(): Promise<StorageAdapter> {
  startSweeper();
  return getStore();
}
