import { NextResponse } from "next/server";
import { getApiStore } from "@/server/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Discoverability endpoint; the old Express app served this at `/`. */
export async function GET() {
  const store = await getApiStore();
  return NextResponse.json({
    name: "Easy To Share API",
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
}
