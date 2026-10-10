import "dotenv/config";
import type { RoomScope } from "./lib/roomScope";

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function list(name: string, fallback: string[]): string[] {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export type StoreDriver = "auto" | "memory" | "mongo";

export const config = {
  env: process.env.NODE_ENV ?? "development",
  port: num("PORT", 4000),
  host: process.env.HOST ?? "0.0.0.0",
  storeDriver: (process.env.STORE_DRIVER ?? "auto") as StoreDriver,
  /** How a client IP is mapped to a sharing bucket. */
  roomScope: (process.env.ROOM_SCOPE ?? "auto") as RoomScope,
  mongoUri: process.env.MONGODB_URI ?? "",
  roomTtlMinutes: num("ROOM_TTL_MINUTES", 30),
  maxFiles: num("MAX_FILES", 2),
  maxFileSizeMb: num("MAX_FILE_SIZE_MB", 5),
  maxTextLength: num("MAX_TEXT_LENGTH", 200_000),
  ipHashSecret: process.env.IP_HASH_SECRET ?? "airforshare-dev-secret",
  corsOrigins: list("CORS_ORIGIN", ["http://localhost:3000"]),
  rateLimitWindowMs: num("RATE_LIMIT_WINDOW_MS", 60_000),
  rateLimitMax: num("RATE_LIMIT_MAX", 240),
  sweepIntervalMs: num("SWEEP_INTERVAL_MS", 60_000),
} as const;

export const isProduction = config.env === "production";
