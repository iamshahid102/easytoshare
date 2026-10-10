import type { ClipItem, Room, StorageAdapter } from "./types";

/** Zero-dependency store used for local development and tests. */
export class MemoryStore implements StorageAdapter {
  readonly name = "memory";
  private readonly rooms = new Map<string, Room>();
  private readonly items = new Map<string, Map<string, ClipItem>>();
  private readonly objects = new Map<string, Buffer>();

  private roomItems(roomId: string): Map<string, ClipItem> {
    let bucket = this.items.get(roomId);
    if (!bucket) {
      bucket = new Map<string, ClipItem>();
      this.items.set(roomId, bucket);
    }
    return bucket;
  }

  async getRoom(id: string): Promise<Room | null> {
    return this.rooms.get(id) ?? null;
  }

  async upsertRoom(room: Room): Promise<void> {
    this.rooms.set(room.id, { ...room });
  }

  async listItems(roomId: string): Promise<ClipItem[]> {
    return [...this.roomItems(roomId).values()].sort(
      (a, b) => a.createdAt - b.createdAt,
    );
  }

  async getItem(roomId: string, itemId: string): Promise<ClipItem | null> {
    return this.items.get(roomId)?.get(itemId) ?? null;
  }

  async putItem(item: ClipItem): Promise<void> {
    this.roomItems(item.roomId).set(item.id, { ...item });
  }

  async deleteItem(roomId: string, itemId: string): Promise<boolean> {
    return this.items.get(roomId)?.delete(itemId) ?? false;
  }

  async clearItems(roomId: string): Promise<ClipItem[]> {
    const bucket = this.items.get(roomId);
    if (!bucket) return [];
    const removed = [...bucket.values()];
    bucket.clear();
    return removed;
  }

  async putObject(key: string, data: Buffer): Promise<void> {
    this.objects.set(key, Buffer.from(data));
  }

  async getObject(key: string): Promise<Buffer | null> {
    return this.objects.get(key) ?? null;
  }

  async deleteObject(key: string): Promise<void> {
    this.objects.delete(key);
  }

  async sweepExpired(now: number): Promise<number> {
    let removed = 0;
    for (const [id, room] of this.rooms) {
      if (room.expiresAt > now) continue;
      this.rooms.delete(id);
      const items = await this.clearItems(id);
      for (const item of items) {
        if (item.storageKey) this.objects.delete(item.storageKey);
      }
      this.items.delete(id);
      removed += 1;
    }
    return removed;
  }

  async close(): Promise<void> {
    this.rooms.clear();
    this.items.clear();
    this.objects.clear();
  }
}
