import { NextResponse } from "next/server";
import { getApiStore } from "@/server/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mirrors the original Express `GET /api/health`.
export async function GET() {
  const store = await getApiStore();
  return NextResponse.json({
    status: "ok",
    store: store.name,
    uptime: process.uptime(),
  });
}
