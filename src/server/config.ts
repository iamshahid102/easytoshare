import type { RoomScope } from "@/server/room-scope";

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export type StoreDriver = "auto" | "memory" | "mongo";

/**
 * Configuration for the API that now lives inside the Next.js app.
 *
 * Next.js reads `.env` / `.env.local` from the project root itself, so no
 * dotenv bootstrapping is required here.
 */
export const config = {
  env: process.env.NODE_ENV ?? "development",
  storeDriver: (process.env.STORE_DRIVER ?? "auto") as StoreDriver,
  /** How a client IP is mapped to a sharing bucket. */
  roomScope: (process.env.ROOM_SCOPE ?? "auto") as RoomScope,
  mongoUri: process.env.MONGODB_URI ?? "",
  roomTtlMinutes: num("ROOM_TTL_MINUTES", 30),
  maxFiles: num("MAX_FILES", 2),
  maxFileSizeMb: num("MAX_FILE_SIZE_MB", 5),
  maxTextLength: num("MAX_TEXT_LENGTH", 200_000),
  ipHashSecret: process.env.IP_HASH_SECRET ?? "airforshare-dev-secret",
  /**
   * Number of reverse proxies directly in front of the app. 1 (the default)
   * trusts the address reported by the immediate hop in `X-Forwarded-For`
   * (nginx marks its client there, and hosting edges such as Vercel set it to
   * the real visitor). Raise it for every additional self-managed hop.
   */
  trustProxyHops: num("TRUST_PROXY_HOPS", 1),
  rateLimitWindowMs: num("RATE_LIMIT_WINDOW_MS", 60_000),
  rateLimitMax: num("RATE_LIMIT_MAX", 240),
  sweepIntervalMs: num("SWEEP_INTERVAL_MS", 60_000),
} as const;

export const isProduction = config.env === "production";
