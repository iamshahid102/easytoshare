import { numericCode } from "../lib/hash";
import { newId } from "../lib/ids";
import { type TierLimits, ttlMsFor } from "../lib/limits";
import type { ClipItem, Room, StorageAdapter, Tier } from "../store/types";

export interface ClipFileDto {
  id: string;
  name: string;
  mime: string;
  size: number;
  url: string;
  owner: boolean;
  createdAt: number;
}

export interface ClipState {
  activeTab: 0 | 1;
  clipId: string;
  clipText: string;
  clipFiles: ClipFileDto[];
  maxFileSize: number;
  maxFilesCount: number;
  expiresAt: number;
  serverTime: number;
}

export function toFileDto(item: ClipItem, ownerId: string): ClipFileDto {
  return {
    id: item.id,
    name: item.name ?? "file",
    mime: item.mime ?? "application/octet-stream",
    size: item.size ?? 0,
    url: `/api/files/${item.id}`,
    owner: item.ownerId === ownerId,
    createdAt: item.createdAt,
  };
}

export async function getOrCreateRoom(
  store: StorageAdapter,
  roomId: string,
  tier: Tier = "anonymous",
): Promise<Room> {
  const existing = await store.getRoom(roomId);
  if (existing) return existing;

  const now = Date.now();
  const room: Room = {
    id: roomId,
    ipHash: roomId,
    tier,
    createdAt: now,
    lastAccessAt: now,
    expiresAt: now + ttlMsFor(tier),
  };
  await store.upsertRoom(room);
  return room;
}

/** Sliding expiry: content lives `ttl` after the most recent access. */
export async function touchRoom(store: StorageAdapter, room: Room): Promise<Room> {
  const now = Date.now();
  const updated: Room = {
    ...room,
    lastAccessAt: now,
    expiresAt: now + ttlMsFor(room.tier),
  };
  await store.upsertRoom(updated);
  return updated;
}

export function buildClipState(
  room: Room,
  items: ClipItem[],
  ownerId: string,
  limits: TierLimits,
): ClipState {
  const textItem = items
    .filter((item) => item.kind === "text")
    .sort((a, b) => b.createdAt - a.createdAt)[0];

  const files = items
    .filter((item) => item.kind === "file")
    .map((item) => toFileDto(item, ownerId));

  return {
    activeTab: 0,
    clipId: numericCode(room.id),
    clipText: textItem?.text ?? "",
    clipFiles: files,
    maxFileSize: limits.maxFileSizeMb,
    maxFilesCount: limits.maxFiles,
    expiresAt: room.expiresAt,
    serverTime: Date.now(),
  };
}

/** Replaces the room's text with a single item (or clears it when empty). */
export async function setRoomText(
  store: StorageAdapter,
  room: Room,
  text: string,
  ownerId: string,
): Promise<ClipItem | null> {
  const items = await store.listItems(room.id);
  for (const item of items) {
    if (item.kind === "text") await store.deleteItem(room.id, item.id);
  }

  if (text.length === 0) return null;

  const item: ClipItem = {
    id: newId(),
    roomId: room.id,
    kind: "text",
    text,
    ownerId,
    createdAt: Date.now(),
  };
  await store.putItem(item);
  return item;
}
