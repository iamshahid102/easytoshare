import { config } from "../config";
import type { Tier } from "../store/types";

export interface TierLimits {
  maxFiles: number;
  maxFileSizeMb: number;
  ttlMinutes: number;
}

export const TIERS: Record<Tier, TierLimits> = {
  anonymous: {
    maxFiles: config.maxFiles,
    maxFileSizeMb: config.maxFileSizeMb,
    ttlMinutes: config.roomTtlMinutes,
  },
  registered: { maxFiles: 5, maxFileSizeMb: 10, ttlMinutes: 30 },
  pro: { maxFiles: 1000, maxFileSizeMb: 1024, ttlMinutes: 120 },
};

export function limitsFor(tier: Tier): TierLimits {
  return TIERS[tier];
}

export function ttlMsFor(tier: Tier): number {
  return TIERS[tier].ttlMinutes * 60 * 1000;
}

const ALLOWED_PREFIXES = ["image/", "audio/", "video/", "text/"];

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/zip",
  "application/json",
  "application/xml",
  "application/rtf",
  "application/gzip",
  "application/x-7z-compressed",
  "application/x-rar-compressed",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/octet-stream",
]);

export function isAllowedMime(mime: string): boolean {
  return (
    ALLOWED_PREFIXES.some((prefix) => mime.startsWith(prefix)) ||
    ALLOWED_MIME.has(mime)
  );
}
