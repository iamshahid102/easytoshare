import { config } from "@/server/config";
import { MemoryStore } from "@/server/store/memory";
import type { StorageAdapter } from "@/server/store/types";

/**
 * Resolves the active storage adapter.
 * - explicit `mongo` driver requires MONGODB_URI
 * - `auto` uses MongoDB when MONGODB_URI is present, otherwise memory
 */
export async function createStore(): Promise<StorageAdapter> {
  const wantsMongo =
    config.storeDriver === "mongo" ||
    (config.storeDriver === "auto" && config.mongoUri.length > 0);

  if (wantsMongo) {
    if (!config.mongoUri) {
      throw new Error("STORE_DRIVER=mongo requires MONGODB_URI to be set");
    }
    const { MongoStore } = await import("@/server/store/mongo");
    return MongoStore.connect(config.mongoUri);
  }

  return new MemoryStore();
}

export type { StorageAdapter } from "@/server/store/types";
