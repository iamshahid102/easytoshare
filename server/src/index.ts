import { createApp } from "./app";
import { config } from "./config";
import { createStore } from "./store";

async function main(): Promise<void> {
  const store = await createStore();
  const app = createApp(store);

  const server = app.listen(config.port, config.host, () => {
    console.log(
      `[airforshare] API listening on http://${config.host}:${config.port} (store: ${store.name}, env: ${config.env})`,
    );
  });

  // Sliding-expiry sweeper: room TTL is refreshed on every access.
  const sweeper = setInterval(() => {
    store
      .sweepExpired(Date.now())
      .then((count) => {
        if (count > 0) {
          console.log(`[airforshare] swept ${count} expired room(s)`);
        }
      })
      .catch((error) => console.error("[airforshare] sweep failed", error));
  }, config.sweepIntervalMs);
  sweeper.unref();

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[airforshare] ${signal} received, shutting down`);
    clearInterval(sweeper);
    server.close();
    await store.close();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error) => {
  console.error("[airforshare] fatal startup error", error);
  process.exit(1);
});
