import type { NextFunction, Request, Response } from "express";
import { config, isProduction } from "../config";
import { hashIp } from "../lib/hash";
import { newDeviceId } from "../lib/ids";
import { roomKey } from "../lib/roomScope";

export const DEVICE_COOKIE = "afs_device";

/**
 * Resolved client IP.
 *
 * `trust proxy` is set to exactly 1 in app.ts, so Express reads
 * X-Forwarded-For only from the immediately preceding trusted hop — a header
 * supplied by a remote client is ignored and cannot be spoofed.
 */
export function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? "0.0.0.0";
}

/**
 * Every request is scoped to a room keyed by HMAC(clientIp, dailySalt).
 * Devices on the same Wi-Fi share a public IP (NAT) and therefore a room —
 * this reproduces the original "no pairing needed" behaviour without ever
 * persisting the raw IP.
 */
export function roomMiddleware(req: Request, res: Response, next: NextFunction): void {
  const key = roomKey(clientIp(req), config.roomScope);
  req.roomId = hashIp(key, config.ipHashSecret);

  let deviceId = req.cookies?.[DEVICE_COOKIE] as string | undefined;
  if (!deviceId) {
    deviceId = newDeviceId();
    res.cookie(DEVICE_COOKIE, deviceId, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 1000 * 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  req.ownerId = deviceId;

  next();
}
