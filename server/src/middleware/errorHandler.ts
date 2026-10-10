import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { config } from "../config";
import { ApiError } from "../lib/errors";

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    error: { code: "not_found", message: "Endpoint not found" },
  });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message },
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    const tooLarge = err.code === "LIMIT_FILE_SIZE";
    res.status(tooLarge ? 413 : 400).json({
      error: {
        code: err.code,
        message: tooLarge
          ? `File exceeds the ${config.maxFileSizeMb}Mb limit`
          : err.message,
      },
    });
    return;
  }

  console.error("[airforshare] unhandled error", err);
  res.status(500).json({
    error: { code: "internal_error", message: "Something went wrong" },
  });
}
