import type { Room } from "../store/types";

declare global {
  namespace Express {
    interface Request {
      /** Room id derived from the hashed client IP. */
      roomId?: string;
      /** Opaque per-device id from the cookie (ownership). */
      ownerId?: string;
      room?: Room;
    }
  }
}

export {};
