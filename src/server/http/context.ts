import type { NextRequest, NextResponse } from "next/server";
import { config, isProduction } from "@/server/config";
import { hashIp } from "@/server/hash";
import { newDeviceId } from "@/server/ids";
import { roomKey } from "@/server/room-scope";

export const DEVICE_COOKIE = "afs_device";
export const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export interface RoomContext {
  roomId: string;
  /** Opaque device id used for ownership checks. */
  ownerId: string;
  clientIp: string;
  /** Set only when this request minted a device id that must be sent back. */
  issuedDeviceId?: string;
}

/**
 * Resolved client IP.
 *
 * Next.js writes the TCP peer address into `X-Forwarded-For` when a client
 * does not supply the header itself, which is the value we read here. When the
 * app runs behind a proxy, `TRUST_PROXY_HOPS` selects the matching hop from
 * the right-hand end of the chain (nginx marks its client there).
 */
export function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const chain = forwarded
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (chain.length === 0) {
    return request.headers.get("x-real-ip")?.trim() || "0.0.0.0";
  }

  const hops = Math.max(1, config.trustProxyHops);
  const index = Math.min(Math.max(chain.length - hops, 0), chain.length - 1);
  return chain[index] ?? "0.0.0.0";
}

/**
 * Every request is scoped to a room keyed by HMAC(clientIp, dailySalt).
 * Devices on the same Wi-Fi share a public IP (NAT) and therefore a room —
 * this reproduces the original "no pairing needed" behaviour without ever
 * persisting the raw IP.
 */
export function resolveRoom(request: NextRequest): RoomContext {
  const ip = clientIp(request);
  const roomId = hashIp(roomKey(ip, config.roomScope), config.ipHashSecret);

  const existing = request.cookies.get(DEVICE_COOKIE)?.value;
  const ownerId = existing ?? newDeviceId();

  return {
    roomId,
    ownerId,
    clientIp: ip,
    ...(existing ? {} : { issuedDeviceId: ownerId }),
  };
}

/** Sends a freshly minted device cookie back to the browser. */
export function attachDeviceCookie<T extends NextResponse>(
  response: T,
  context: RoomContext,
): T {
  if (context.issuedDeviceId) {
    response.cookies.set(DEVICE_COOKIE, context.issuedDeviceId, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: DEVICE_COOKIE_MAX_AGE,
      path: "/",
    });
  }
  return response;
}
