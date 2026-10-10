import { createHash, createHmac } from "node:crypto";

/**
 * Hash a client IP together with a rolling daily salt.
 * Raw IPs are never persisted or logged; the mapping also rotates each day.
 */
export function hashIp(ip: string, secret: string, now = new Date()): string {
  const day = now.toISOString().slice(0, 10);
  return createHmac("sha256", secret)
    .update(`${ip}|${day}`)
    .digest("hex")
    .slice(0, 32);
}

/** Deterministic short numeric code (mirrors the original's numeric clipId). */
export function numericCode(input: string, length = 6): string {
  const digest = createHash("sha256").update(input).digest();
  let value = 0;
  for (let index = 0; index < 4; index += 1) {
    value = (value * 256 + (digest[index] ?? 0)) % 1_000_000;
  }
  return String(value).padStart(length, "0");
}
