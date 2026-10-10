/**
 * Typed client for the AirForShare Express API.
 *
 * By default requests are relative (`/api/...`) and reach the backend through
 * the Next.js rewrite proxy — same origin, so cookies and SSE work with no
 * CORS setup. Set `NEXT_PUBLIC_API_URL` to talk to the backend directly.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface ClipFile {
  id: string;
  name: string;
  mime: string;
  size: number;
  url: string;
  owner: boolean;
  createdAt: number;
}

export interface ClipState {
  activeTab: 0 | 1;
  clipId: string;
  clipText: string;
  clipFiles: ClipFile[];
  maxFileSize: number;
  maxFilesCount: number;
  expiresAt: number;
  serverTime: number;
}

export type RealtimeEvent = "ready" | "update" | "clear";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function errorMessage(error: unknown, status: number): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return `Request failed (${status})`;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (res.status === 204) return undefined as T;

  const raw = await res.text();
  let parsed: unknown = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }

  if (!res.ok) {
    const body = parsed as { error?: { code?: string; message?: string } } | null;
    throw new ApiError(
      res.status,
      body?.error?.code ?? "error",
      body?.error?.message ?? `Request failed (${res.status})`,
    );
  }

  return parsed as T;
}

export async function getClip(): Promise<ClipState> {
  return request<ClipState>("/api/clip");
}

export async function saveText(text: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/api/text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

export async function uploadFile(file: File): Promise<ClipFile> {
  const form = new FormData();
  form.append("file", file, file.name);
  const result = await request<{ file: ClipFile }>("/api/files", {
    method: "POST",
    body: form,
  });
  return result.file;
}

export async function deleteFile(id: string): Promise<void> {
  await request<void>(`/api/files/${id}`, { method: "DELETE" });
}

export async function clearClip(): Promise<void> {
  await request<void>("/api/clear", { method: "POST" });
}

/** Turns a backend-relative URL (`/api/files/x`) into an absolute one. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${BASE}${path}`;
}

/**
 * Subscribes to room updates over SSE. Returns an unsubscribe function.
 * EventSource reconnects automatically on transient failures.
 */
export function subscribe(
  onEvent: (type: RealtimeEvent) => void,
  onStatus?: (online: boolean) => void,
): () => void {
  if (typeof window === "undefined" || typeof EventSource === "undefined") {
    return () => undefined;
  }

  const source = new EventSource(`${BASE}/api/events`, {
    withCredentials: true,
  });

  const handler =
    (type: RealtimeEvent) => () => {
      onStatus?.(true);
      onEvent(type);
    };

  source.addEventListener("ready", handler("ready"));
  source.addEventListener("update", handler("update"));
  source.addEventListener("clear", handler("clear"));
  source.onerror = () => onStatus?.(false);

  return () => source.close();
}

export function describeError(error: unknown): string {
  return errorMessage(error, 500);
}
