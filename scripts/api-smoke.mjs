/**
 * End-to-end smoke test for the AirForShare API.
 *
 * The API is now served by Next.js itself, so this suite hits the app origin
 * directly — the same URL a browser uses.
 *
 * Usage: node scripts/api-smoke.mjs   (app must be running)
 */
const BASE = process.env.APP_BASE ?? "http://localhost:3000";

let failures = 0;
let checks = 0;

function check(name, condition, extra = "") {
  checks += 1;
  const ok = Boolean(condition);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? `  (${extra})` : ""}`);
}

function makeJar() {
  const store = new Map();
  return {
    header: () =>
      [...store.entries()].map(([key, value]) => `${key}=${value}`).join("; "),
    absorb(res) {
      const cookies = res.headers.getSetCookie?.() ?? [];
      for (const cookie of cookies) {
        const [pair] = cookie.split(";");
        const index = pair.indexOf("=");
        if (index > 0) {
          store.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
        }
      }
    },
    size: () => store.size,
  };
}

async function call(method, path, { body, form, cookies } = {}) {
  const headers = {};
  if (cookies) headers.cookie = cookies.header();
  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    headers["content-type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: payload,
    redirect: "manual",
  });
  if (cookies) cookies.absorb(res);
  const type = res.headers.get("content-type") ?? "";
  const data = type.includes("application/json")
    ? await res.json()
    : Buffer.from(await res.arrayBuffer());
  return { status: res.status, data, headers: res.headers };
}

function fileForm(name, content, type) {
  const form = new FormData();
  form.append("file", new Blob([content], { type }), name);
  return form;
}

async function main() {
  const deviceA = makeJar();
  const deviceB = makeJar();

  // 1. health
  const health = await call("GET", "/api/health");
  check("GET /api/health returns ok", health.status === 200 && health.data.status === "ok", `store=${health.data.store}`);

  // 2. start from a clean room (both suites share one IP-keyed bucket)
  await call("POST", "/api/clear", { cookies: deviceA });

  // 3. initial clip, creates room and issues device cookie
  const clip0 = await call("GET", "/api/clip", { cookies: deviceA });
  check("GET /api/clip -> 200", clip0.status === 200);
  check("clip state has expected shape",
    typeof clip0.data.clipId === "string" &&
      clip0.data.clipText === "" &&
      Array.isArray(clip0.data.clipFiles) &&
      clip0.data.maxFilesCount === 2 &&
      clip0.data.maxFileSize === 5,
    `clipId=${clip0.data.clipId} files=${clip0.data.maxFilesCount} size=${clip0.data.maxFileSize}`);
  check("device cookie issued", deviceA.size() >= 1, `cookies=${deviceA.size()}`);

  // 3. save text
  const save = await call("POST", "/api/text", { body: { text: "hello from device A" }, cookies: deviceA });
  check("POST /api/text -> 200 ok", save.status === 200 && save.data.ok === true);
  const clip1 = await call("GET", "/api/clip", { cookies: deviceA });
  check("text round-trips", clip1.data.clipText === "hello from device A", `clipText="${clip1.data.clipText}"`);

  // 4. upload a file
  const up1 = await call("POST", "/api/files", { form: fileForm("hello.txt", "hello airforshare", "text/plain"), cookies: deviceA });
  check("POST /api/files -> 201", up1.status === 201, `id=${up1.data?.file?.id}`);
  const fileId = up1.data?.file?.id;
  check("uploaded file is owned by device A", up1.data?.file?.owner === true);

  // 5b. disallowed MIME type is rejected (checked while the room has capacity)
  const badType = await call("POST", "/api/files", { form: fileForm("evil.exe", "MZ", "application/x-msdownload"), cookies: deviceA });
  check("disallowed mime -> 400 mime_not_allowed", badType.status === 400 && badType.data?.error?.code === "mime_not_allowed", `code=${badType.data?.error?.code}`);

  // 5. download
  const dl = await call("GET", `/api/files/${fileId}`, { cookies: deviceA });
  check("GET /api/files/:id -> 200 with bytes", dl.status === 200 && dl.data.toString() === "hello airforshare");
  check("download sets attachment header", (dl.headers.get("content-disposition") ?? "").includes("attachment"));

  // 6. a second file fills the anonymous quota (max 2)
  const up2 = await call("POST", "/api/files", { form: fileForm("second.txt", "second", "text/plain"), cookies: deviceA });
  check("second upload -> 201", up2.status === 201);

  // 7. third upload exceeds the limit
  const up3 = await call("POST", "/api/files", { form: fileForm("third.txt", "third", "text/plain"), cookies: deviceA });
  check("third upload -> 409 max_files_reached", up3.status === 409 && up3.data?.error?.code === "max_files_reached", `code=${up3.data?.error?.code}`);

  // 8. device B cannot delete device A's file
  const forbidden = await call("DELETE", `/api/files/${fileId}`, { cookies: deviceB });
  check("cross-device delete -> 403 not_owner", forbidden.status === 403 && forbidden.data?.error?.code === "not_owner", `code=${forbidden.data?.error?.code}`);

  // 9. oversized upload is rejected (6 MB > 5 MB)
  const big = Buffer.alloc(6 * 1024 * 1024, 1);
  const oversize = await call("POST", "/api/files", { form: fileForm("big.bin", big, "application/octet-stream"), cookies: deviceB });
  check("oversized upload -> 413", oversize.status === 413, `code=${oversize.data?.error?.code}`);

  // 11. owner delete works
  const del = await call("DELETE", `/api/files/${fileId}`, { cookies: deviceA });
  check("owner delete -> 204", del.status === 204);
  const gone = await call("GET", `/api/files/${fileId}`, { cookies: deviceA });
  check("deleted file -> 404", gone.status === 404);

  // 12. clear
  const clear = await call("POST", "/api/clear", { cookies: deviceA });
  check("POST /api/clear -> 204", clear.status === 204);
  const clip2 = await call("GET", "/api/clip", { cookies: deviceA });
  check("room empty after clear", clip2.data.clipFiles.length === 0 && clip2.data.clipText === "");

  // 13. SSE stream emits a ready event
  const controller = new AbortController();
  const sse = await fetch(`${BASE}/api/events`, {
    headers: { cookie: deviceA.header(), accept: "text/event-stream" },
    signal: controller.signal,
  });
  const reader = sse.body.getReader();
  const decoder = new TextDecoder();
  let streamBuffer = "";

  const readUntil = async (predicate, timeoutMs = 4000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline && !predicate(streamBuffer)) {
      const { value, done } = await reader.read();
      if (done) break;
      streamBuffer += decoder.decode(value, { stream: true });
    }
    return streamBuffer;
  };

  await readUntil((buf) => buf.includes("event: ready"));
  check("GET /api/events streams SSE ready", sse.status === 200 && streamBuffer.includes("event: ready"));

  // 14. a mutation is pushed to listeners in realtime
  await call("POST", "/api/text", { body: { text: "realtime ping" }, cookies: deviceA });
  await readUntil((buf) => buf.includes("event: update"));
  check("SSE propagates update events", streamBuffer.includes("event: update"));

  controller.abort();

  console.log(`\n${checks - failures}/${checks} checks passed`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("smoke test crashed:", error);
  process.exit(1);
});
