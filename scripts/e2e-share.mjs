/**
 * End-to-end single-IP sharing test.
 *
 * Simulates two independent devices (separate cookie jars) that both come
 * from the same IP address, talking to the user-facing origin (:3000).
 * The UI and the API are served by the same Next.js app, so this also
 * proves cookies and SSE work end to end in the browser-facing setup.
 *
 * Usage: node scripts/e2e-share.mjs   (the app must be running)
 */

const APP = process.env.APP_BASE ?? "http://localhost:3000";

let checks = 0;
let failures = 0;

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
      [...store.entries()].map(([k, v]) => `${k}=${v}`).join("; "),
    absorb(res) {
      for (const cookie of res.headers.getSetCookie?.() ?? []) {
        const [pair] = cookie.split(";");
        const index = pair.indexOf("=");
        if (index > 0) store.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
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
  const res = await fetch(`${APP}${path}`, { method, headers, body: payload, redirect: "manual" });
  if (cookies) cookies.absorb(res);
  const type = res.headers.get("content-type") ?? "";
  const data = type.includes("application/json") ? await res.json() : Buffer.from(await res.arrayBuffer());
  return { status: res.status, data, headers: res.headers };
}

function form(name, content, type) {
  const fd = new FormData();
  fd.append("file", new Blob([content], { type }), name);
  return fd;
}

async function main() {
  const deviceA = makeJar();
  const deviceB = makeJar();

  console.log(`Testing against ${APP}\n`);

  // 0. reachability
  const health = await call("GET", "/api/health", { cookies: deviceA });
  check("Next.js serves the API in-process", health.status === 200 && health.data.store, `store=${health.data.store}`);

  // 1. start clean, then both devices read the same room
  await call("POST", "/api/clear", { cookies: deviceA });
  const a0 = await call("GET", "/api/clip", { cookies: deviceA });
  const b0 = await call("GET", "/api/clip", { cookies: deviceB });
  check("device A can load the room", a0.status === 200);
  check("device B can load the room", b0.status === 200);
  check("device cookies round-trip through the API", deviceA.size() > 0 && deviceB.size() > 0);
  check(
    "both devices share one room (same IP)",
    a0.data.clipId === b0.data.clipId,
    `clipId=${a0.data.clipId} / ${b0.data.clipId}`,
  );

  // 2. text saved by A is visible to B  <-- the core "single IP" test
  const save = await call("POST", "/api/text", { body: { text: "hello from device A" }, cookies: deviceA });
  check("device A saved text", save.status === 200);
  const b1 = await call("GET", "/api/clip", { cookies: deviceB });
  check(
    "device B receives A's text",
    b1.data.clipText === "hello from device A",
    `clipText="${b1.data.clipText}"`,
  );

  // 3. file uploaded by A is listed and downloadable by B
  const up = await call("POST", "/api/files", {
    form: form("hello.txt", "payload-from-A", "text/plain"),
    cookies: deviceA,
  });
  check("device A uploaded a file", up.status === 201, `id=${up.data?.file?.id}`);
  const fileId = up.data?.file?.id;

  const b2 = await call("GET", "/api/clip", { cookies: deviceB });
  check(
    "device B sees A's file",
    b2.data.clipFiles.some((f) => f.id === fileId),
    `files=${b2.data.clipFiles.length}`,
  );

  const dl = await call("GET", `/api/files/${fileId}`, { cookies: deviceB });
  check(
    "device B downloads A's file",
    dl.status === 200 && dl.data.toString() === "payload-from-A",
  );
  check("B's copy is marked as not owned", b2.data.clipFiles.find((f) => f.id === fileId)?.owner === false);
  check("A's copy is marked as owned", up.data.file.owner === true);

  // 4. ownership rules
  const bDel = await call("DELETE", `/api/files/${fileId}`, { cookies: deviceB });
  check("device B cannot delete A's file (403)", bDel.status === 403, `code=${bDel.data?.error?.code}`);
  const aDel = await call("DELETE", `/api/files/${fileId}`, { cookies: deviceA });
  check("device A can delete its own file (204)", aDel.status === 204);

  // 5. quota limits apply per room
  const f1 = await call("POST", "/api/files", { form: form("one.txt", "1", "text/plain"), cookies: deviceA });
  const f2 = await call("POST", "/api/files", { form: form("two.txt", "2", "text/plain"), cookies: deviceA });
  const f3 = await call("POST", "/api/files", { form: form("three.txt", "3", "text/plain"), cookies: deviceA });
  check("two uploads accepted", f1.status === 201 && f2.status === 201);
  check("third upload rejected (409)", f3.status === 409, `code=${f3.data?.error?.code}`);

  // 6. clear propagates to B
  const clear = await call("POST", "/api/clear", { cookies: deviceA });
  const b3 = await call("GET", "/api/clip", { cookies: deviceB });
  check("clear empties the shared room", clear.status === 204 && b3.data.clipFiles.length === 0);

  // 7. realtime: B listens on SSE while A mutates
  const controller = new AbortController();
  let stream = "";
  const res = await fetch(`${APP}/api/events`, {
    headers: { cookie: deviceB.header(), accept: "text/event-stream" },
    signal: controller.signal,
  });
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const readUntil = async (predicate, timeoutMs = 5000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline && !predicate(stream)) {
      const { value, done } = await reader.read();
      if (done) break;
      stream += decoder.decode(value, { stream: true });
    }
    return stream;
  };

  await readUntil((s) => s.includes("event: ready"));
  check("SSE streams from the app origin", res.status === 200 && stream.includes("event: ready"));

  await call("POST", "/api/text", { body: { text: "realtime ping" }, cookies: deviceA });
  await readUntil((s) => s.includes("event: update"));
  check("device B is pushed an update in realtime", stream.includes("event: update"));
  controller.abort();

  console.log(`\n${checks - failures}/${checks} checks passed`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("e2e test crashed:", error);
  process.exit(1);
});
