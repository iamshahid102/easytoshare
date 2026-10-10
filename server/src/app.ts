import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { config, isProduction } from "./config";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { roomMiddleware } from "./middleware/room";
import { createApiRouter } from "./routes";
import type { StorageAdapter } from "./store";

export function createApp(store: StorageAdapter): Express {
  const app = express();

  app.disable("x-powered-by");
  // Trust exactly one proxy hop (nginx / load balancer) so req.ip is correct.
  app.set("trust proxy", 1);

  app.use(
    helmet({
      // Allows the API to serve downloadable files cross-origin.
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
    }),
  );
  app.use(
    compression({
      // Never buffer SSE responses.
      filter: (req, res) =>
        req.headers.accept !== "text/event-stream" &&
        compression.filter(req, res),
    }),
  );
  app.use(morgan(isProduction ? "combined" : "dev"));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.use(
    "/api",
    rateLimit({
      windowMs: config.rateLimitWindowMs,
      limit: config.rateLimitMax,
      standardHeaders: "draft-7",
      legacyHeaders: false,
    }),
  );

  app.use("/api", roomMiddleware);
  app.use("/api", createApiRouter(store));

  app.get("/", (_req, res) => {
    res.json({
      name: "AirForShare API",
      version: "0.1.0",
      store: store.name,
      endpoints: [
        "GET    /api/health",
        "GET    /api/clip",
        "POST   /api/text",
        "POST   /api/files        (multipart field: file)",
        "GET    /api/files/:id",
        "DELETE /api/files/:id",
        "POST   /api/clear",
        "GET    /api/events       (SSE)",
      ],
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
