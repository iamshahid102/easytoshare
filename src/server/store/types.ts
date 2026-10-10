export type Tier = "anonymous" | "registered" | "pro";
export type ItemKind = "text" | "file";

export interface Room {
  /** Room id == HMAC(ip, dailySalt); all devices behind one public IP share it. */
  id: string;
  ipHash: string;
  tier: Tier;
  createdAt: number;
  lastAccessAt: number;
  /** Sliding expiry: content is removed this many ms after last access. */
  expiresAt: number;
}

export interface ClipItem {
  id: string;
  roomId: string;
  kind: ItemKind;
  /** Present when kind === "text". */
  text?: string;
  /** Present when kind === "file". */
  name?: string;
  mime?: string;
  size?: number;
  storageKey?: string;
  /** Device id of the uploader, used for owner-only deletion. */
  ownerId: string;
  createdAt: number;
}

export interface StorageAdapter {
  readonly name: string;
  getRoom(id: string): Promise<Room | null>;
  upsertRoom(room: Room): Promise<void>;
  listItems(roomId: string): Promise<ClipItem[]>;
  getItem(roomId: string, itemId: string): Promise<ClipItem | null>;
  putItem(item: ClipItem): Promise<void>;
  deleteItem(roomId: string, itemId: string): Promise<boolean>;
  /** Removes every item in the room and returns the removed items. */
  clearItems(roomId: string): Promise<ClipItem[]>;
  putObject(key: string, data: Buffer): Promise<void>;
  getObject(key: string): Promise<Buffer | null>;
  deleteObject(key: string): Promise<void>;
  /** Deletes rooms past their sliding expiry plus their items and objects. */
  sweepExpired(now: number): Promise<number>;
  close(): Promise<void>;
}
