import mongoose from "mongoose";
import type { ClipItem, ItemKind, Room, StorageAdapter, Tier } from "./types";

interface RoomDoc {
  _id: string;
  ipHash: string;
  tier: Tier;
  createdAt: Date;
  lastAccessAt: Date;
  expiresAt: Date;
}

interface ItemDoc {
  _id: string;
  roomId: string;
  kind: ItemKind;
  text?: string;
  name?: string;
  mime?: string;
  size?: number;
  storageKey?: string;
  ownerId: string;
  createdAt: Date;
}

interface ObjectDoc {
  _id: string;
  data: Buffer;
  expiresAt: Date;
}

const OBJECT_BACKSTOP_MS = 24 * 60 * 60 * 1000;

function toBuffer(value: unknown): Buffer | null {
  if (Buffer.isBuffer(value)) return value;
  if (value && typeof value === "object" && "buffer" in value) {
    const inner = (value as { buffer?: unknown }).buffer;
    if (Buffer.isBuffer(inner)) return inner;
  }
  if (value instanceof Uint8Array) return Buffer.from(value);
  return null;
}

/** MongoDB-backed store. Metadata expires via TTL indexes plus a sweeping job. */
export class MongoStore implements StorageAdapter {
  readonly name = "mongo";

  private constructor(
    private readonly rooms: mongoose.mongo.Collection<RoomDoc>,
    private readonly items: mongoose.mongo.Collection<ItemDoc>,
    private readonly objects: mongoose.mongo.Collection<ObjectDoc>,
  ) {}

  static async connect(uri: string): Promise<MongoStore> {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    const db = mongoose.connection;
    const rooms = db.collection<RoomDoc>("rooms");
    const items = db.collection<ItemDoc>("items");
    const objects = db.collection<ObjectDoc>("objects");

    await Promise.all([
      rooms.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      items.createIndex({ roomId: 1 }),
      objects.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]);

    return new MongoStore(rooms, items, objects);
  }

  private mapRoom(doc: RoomDoc): Room {
    return {
      id: doc._id,
      ipHash: doc.ipHash,
      tier: doc.tier,
      createdAt: doc.createdAt.getTime(),
      lastAccessAt: doc.lastAccessAt.getTime(),
      expiresAt: doc.expiresAt.getTime(),
    };
  }

  private mapItem(doc: ItemDoc): ClipItem {
    return {
      id: doc._id,
      roomId: doc.roomId,
      kind: doc.kind,
      ...(doc.text !== undefined ? { text: doc.text } : {}),
      ...(doc.name !== undefined ? { name: doc.name } : {}),
      ...(doc.mime !== undefined ? { mime: doc.mime } : {}),
      ...(doc.size !== undefined ? { size: doc.size } : {}),
      ...(doc.storageKey !== undefined ? { storageKey: doc.storageKey } : {}),
      ownerId: doc.ownerId,
      createdAt: doc.createdAt.getTime(),
    };
  }

  async getRoom(id: string): Promise<Room | null> {
    const doc = await this.rooms.findOne({ _id: id });
    return doc ? this.mapRoom(doc) : null;
  }

  async upsertRoom(room: Room): Promise<void> {
    await this.rooms.replaceOne(
      { _id: room.id },
      {
        ipHash: room.ipHash,
        tier: room.tier,
        createdAt: new Date(room.createdAt),
        lastAccessAt: new Date(room.lastAccessAt),
        expiresAt: new Date(room.expiresAt),
      },
      { upsert: true },
    );
  }

  async listItems(roomId: string): Promise<ClipItem[]> {
    const docs = await this.items.find({ roomId }).sort({ createdAt: 1 }).toArray();
    return docs.map((doc) => this.mapItem(doc));
  }

  async getItem(roomId: string, itemId: string): Promise<ClipItem | null> {
    const doc = await this.items.findOne({ _id: itemId, roomId });
    return doc ? this.mapItem(doc) : null;
  }

  async putItem(item: ClipItem): Promise<void> {
    await this.items.replaceOne(
      { _id: item.id },
      {
        roomId: item.roomId,
        kind: item.kind,
        ownerId: item.ownerId,
        createdAt: new Date(item.createdAt),
        ...(item.text !== undefined ? { text: item.text } : {}),
        ...(item.name !== undefined ? { name: item.name } : {}),
        ...(item.mime !== undefined ? { mime: item.mime } : {}),
        ...(item.size !== undefined ? { size: item.size } : {}),
        ...(item.storageKey !== undefined ? { storageKey: item.storageKey } : {}),
      },
      { upsert: true },
    );
  }

  async deleteItem(roomId: string, itemId: string): Promise<boolean> {
    const result = await this.items.deleteOne({ _id: itemId, roomId });
    return result.deletedCount > 0;
  }

  async clearItems(roomId: string): Promise<ClipItem[]> {
    const docs = await this.items.find({ roomId }).toArray();
    if (docs.length > 0) await this.items.deleteMany({ roomId });
    return docs.map((doc) => this.mapItem(doc));
  }

  async putObject(key: string, data: Buffer): Promise<void> {
    await this.objects.replaceOne(
      { _id: key },
      { data, expiresAt: new Date(Date.now() + OBJECT_BACKSTOP_MS) },
      { upsert: true },
    );
  }

  async getObject(key: string): Promise<Buffer | null> {
    const doc = await this.objects.findOne({ _id: key });
    return doc ? toBuffer(doc.data) : null;
  }

  async deleteObject(key: string): Promise<void> {
    await this.objects.deleteOne({ _id: key });
  }

  async sweepExpired(now: number): Promise<number> {
    const expired = await this.rooms
      .find({ expiresAt: { $lte: new Date(now) } })
      .toArray();

    for (const room of expired) {
      const items = await this.clearItems(room._id);
      const keys = items
        .map((item) => item.storageKey)
        .filter((key): key is string => Boolean(key));
      if (keys.length > 0) {
        await this.objects.deleteMany({ _id: { $in: keys } });
      }
      await this.rooms.deleteOne({ _id: room._id });
    }

    return expired.length;
  }

  async close(): Promise<void> {
    await mongoose.disconnect();
  }
}
