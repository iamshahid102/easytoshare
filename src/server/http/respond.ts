import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/server/errors";

/** `{ error: { code, message } }` with the statuses the contract promises. */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }

  console.error("[easy-to-share] unhandled error", error);
  return NextResponse.json(
    { error: { code: "internal_error", message: "Something went wrong" } },
    { status: 500 },
  );
}

/** Parses a JSON body, rejecting malformed payloads with a 400. */
export async function readJsonBody(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw ApiError.badRequest("Invalid JSON body", "validation_error");
  }
}
