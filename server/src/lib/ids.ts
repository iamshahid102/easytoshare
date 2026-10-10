import { randomBytes, randomUUID } from "node:crypto";

/** Short, URL-safe, collision-resistant item id. */
export function newId(): string {
  return randomUUID().replace(/-/g, "").slice(0, 16);
}

/** Opaque per-device identifier stored in an httpOnly cookie. */
export function newDeviceId(): string {
  return randomBytes(16).toString("hex");
}

/** Safe, display-only filename. */
export function safeFileName(input: string | undefined): string {
  const fallback = "file";
  if (!input) return fallback;
  const cleaned = input
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    ?.replace(/[\u0000-\u001f\u007f]/g, "")
    .trim();
  return cleaned && cleaned.length > 0 ? cleaned.slice(0, 200) : fallback;
}
