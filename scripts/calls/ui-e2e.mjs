#!/usr/bin/env node
/**
 * VC1, THE REAL CALL SCREENS THROUGH A REAL CALL ON THIS MACHINE.
 *
 * `livekit-e2e.mjs` proves the media and the SQL with a bare page. This one
 * drives the REAL call UI components (`apps/web/src/components/calls/*`: the
 * thread's call buttons, the global call layer with its deep link, the
 * incoming screen, the call stage with `livekit-client`, the in-call
 * controls, the ended screen) in two headless Chromium pages with fake
 * camera and microphone devices, through one full video call:
 *
 *   A taps Video call in the thread  ->  A sees "Ringing" (and is in the room)
 *   B opens the push link ?call=<id>  ->  B's call layer resolves it: incoming
 *   B taps Accept                     ->  both connect; each decodes the other's video
 *   A mutes                           ->  B sees "Adaeze muted their microphone"
 *   A turns the camera off and on     ->  B's stage shows the placeholder, then video
 *   B ends the call                   ->  both see the ended screen; the database
 *                                         says ENDED with one marker in the thread
 *
 * What runs for real: the components (bundled with esbuild from the source,
 * nothing reimplemented), `livekit-client` 2.22.3, the open-source
 * `livekit-server`, Vallo's token service and LiveKit adapter, Vallo's
 * webhook handler, and the VC1 SQL on PGlite (`call_start`, `call_accept`,
 * `call_heartbeat`, `call_join_check`, `call_end`, `call_provider_event`).
 * What stands in: the server actions are a thin HTTP shim in this script
 * that calls the same database functions the actions call, with the same
 * snapshot mapping (`snapshotFromRow`) and the same refusal sentences
 * (`errors.ts`); Next.js routing (`next/navigation`) is a stub; there is no
 * Supabase Realtime (the screens' heartbeat carries the state, as it does
 * when realtime drops). The keys are random per run; nothing touches
 * production, LiveKit Cloud or a phone. Never report it as any of those.
 *
 *   LIVEKIT_SERVER_BIN=/path/to/livekit-server \
 *   VC_PGLITE_MODULE=/path/to/@electric-sql/pglite/dist/index.js \
 *   [VC_CHROMIUM=/opt/pw-browsers/chromium-1194/chrome-linux/chrome] \
 *     node scripts/calls/ui-e2e.mjs
 */
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const web = join(root, "apps", "web");
const src = join(web, "src");

const BIN = process.env.LIVEKIT_SERVER_BIN || "livekit-server";
const PGLITE = process.env.VC_PGLITE_MODULE || "";
const CHROME = process.env.VC_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const LK_PORT = Number(process.env.VC_LIVEKIT_PORT || 7880);
const HTTP_PORT = Number(process.env.VC_HTTP_PORT || 7898);
const API_KEY = `APIui${randomBytes(4).toString("hex")}`;
const API_SECRET = randomBytes(32).toString("hex");

const MEMBER = "957b3bd2-cce3-425d-bba9-5cd876ca3d62";
const HOST = "03f3dd52-ea28-4852-9abe-e5b0a67c2a43";

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms, every = 250) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = await fn();
    if (v) return v;
    await sleep(every);
  }
  return null;
}

/* ------------------------------------------------------- server modules */

async function bundleServerModules(out) {
  const { build } = await import(pathToFileURL(join(root, "node_modules/esbuild/lib/main.js")).href);
  const empty = join(out, "empty.mjs");
  writeFileSync(empty, "export {};\n");
  await build({
    entryPoints: {
      livekit: join(src, "lib/calls/provider/livekit.ts"),
      tokens: join(src, "lib/calls/token-service.ts"),
      webhook: join(src, "lib/calls/webhook.ts"),
      lifecycle: join(src, "lib/calls/lifecycle.ts"),
      errors: join(src, "lib/calls/errors.ts"),
    },
    outdir: out,
    bundle: true,
    platform: "node",
    format: "esm",
    outExtension: { ".js": ".mjs" },
    alias: { "server-only": empty },
    logLevel: "error",
  });
  const load = (name) => import(pathToFileURL(join(out, `${name}.mjs`)).href);
  return {
    livekit: await load("livekit"),
    tokens: await load("tokens"),
    webhook: await load("webhook"),
    lifecycle: await load("lifecycle"),
    errors: await load("errors"),
  };
}

/* ------------------------------------------------------ browser bundle */

const STUBS = {
  "next/navigation": `
    const calls = (window.__router = window.__router || { calls: [] });
    const router = {
      push: (href) => calls.calls.push(["push", href]),
      replace: (href) => { calls.calls.push(["replace", href]); history.replaceState(null, "", href); },
      refresh: () => calls.calls.push(["refresh"]), back() {}, prefetch() {},
    };
    export const useRouter = () => router;
    export const usePathname = () => window.location.pathname;
    export const useSearchParams = () => new URLSearchParams(window.location.search);
    export const redirect = () => { throw new Error("redirect"); };
    export const notFound = () => { throw new Error("notFound"); };
  `,
  "next/link": `
    import { createElement } from "react";
    export default function Link({ href, prefetch, replace, scroll, ...rest }) { return createElement("a", { ...rest, href: String(href) }); }
  `,
  "server-only": `export {};`,
};

async function bundleBrowser(out) {
  const { build } = await import(pathToFileURL(join(root, "node_modules/esbuild/lib/main.js")).href);
  const plugin = {
    name: "vallo-ui-e2e",
    setup(b) {
      for (const [spec, source] of Object.entries(STUBS)) {
        const file = join(out, `${spec.replace(/[^a-z0-9]/gi, "_")}.jsx`);
        writeFileSync(file, source);
        b.onResolve({ filter: new RegExp(`^${spec.replace(/[/]/g, "\\/")}$`) }, () => ({ path: file }));
      }
      b.onLoad({ filter: /\.css$/ }, () => ({ contents: "", loader: "js" }));
      /* A "use server" module becomes a POST to this script, which runs the
         same database function the action runs. */
      b.onLoad({ filter: /\.(ts|tsx)$/ }, (args) => {
        const source = readFileSync(args.path, "utf8");
        if (!/^\s*["']use server["'];?/.test(source)) return undefined;
        const names = [...source.matchAll(/export\s+async\s+function\s+([A-Za-z0-9_]+)/g)].map((m) => m[1]);
        return {
          contents: names
            .map(
              (n) =>
                `export const ${n} = async (input) => { const r = await fetch("/rpc/${n}", { method: "POST", headers: { "content-type": "application/json", "x-who": window.__who }, body: JSON.stringify(input ?? {}) }); return r.json(); };`,
            )
            .join("\n"),
          loader: "js",
        };
      });
    },
  };
  const entries = {
    caller: `
      import { createRoot } from "react-dom/client";
      import { getDictionary } from "@vallo/i18n";
      import { CallButtons } from "@/components/calls/CallButtons";
      import { CallSurface } from "@/components/calls/CallSurface";
      window.__who = "A";
      const copy = getDictionary("en").calls;
      createRoot(document.getElementById("root")).render(
        <div><header style={{ display: "flex", gap: 8 }}><h1>Thread</h1><CallButtons conversationId={window.__conv} name="Host" contextLine="2 bedroom flat, Lekki Phase 1" copy={copy} /></header><CallSurface copy={copy} /></div>,
      );
    `,
    callee: `
      import { createRoot } from "react-dom/client";
      import { getDictionary } from "@vallo/i18n";
      import { CallLayer } from "@/components/calls/CallLayer";
      window.__who = "B";
      createRoot(document.getElementById("root")).render(<CallLayer userId={window.__me} copy={getDictionary("en").calls} />);
    `,
  };
  const bundles = {};
  for (const [name, entry] of Object.entries(entries)) {
    writeFileSync(join(out, `${name}.tsx`), entry);
    await build({
      entryPoints: [join(out, `${name}.tsx`)],
      bundle: true,
      platform: "browser",
      format: "iife",
      outfile: join(out, `${name}.js`),
      jsx: "automatic",
      logLevel: "error",
      alias: { "@": src },
      nodePaths: [join(root, "node_modules")],
      define: { "process.env.NODE_ENV": '"production"' },
      banner: { js: "window.process = window.process || { env: { NODE_ENV: 'production' } };" },
      plugins: [plugin],
    });
    bundles[name] = readFileSync(join(out, `${name}.js`), "utf8");
  }
  return bundles;
}

/* ------------------------------------------------------------- servers */

function startLiveKit(webhookUrl) {
  const config = [
    `port: ${LK_PORT}`,
    "rtc:",
    "  tcp_port: 7881",
    "  port_range_start: 50000",
    "  port_range_end: 50200",
    "  use_external_ip: false",
    "  enable_loopback_candidate: true",
    "keys:",
    `  ${API_KEY}: ${API_SECRET}`,
    "webhook:",
    `  api_key: ${API_KEY}`,
    "  urls:",
    `    - ${webhookUrl}`,
    "logging:",
    "  level: warn",
  ].join("\n");
  const child = spawn(BIN, ["--bind", "127.0.0.1", "--node-ip", "127.0.0.1", "--config-body", config], { stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  child.stdout.on("data", (d) => (log += d));
  child.stderr.on("data", (d) => (log += d));
  return { child, log: () => log };
}

async function main() {
  if (!existsSync(BIN) && BIN !== "livekit-server") {
    console.log(`SKIP  no livekit-server at ${BIN}`);
    process.exit(2);
  }
  if (!PGLITE) {
    console.log("SKIP  set VC_PGLITE_MODULE (the screens need the real VC1 SQL behind them; see the header).");
    process.exit(2);
  }
  const out = mkdtempSync(join(process.env.VC_OUT_DIR || tmpdir(), "vallo-vc1-ui-"));
  const mods = await bundleServerModules(out);
  const bundles = await bundleBrowser(out);
  const css = [
    readFileSync(join(root, "packages/design-tokens/src/tokens.css"), "utf8"),
    readFileSync(join(src, "app/css/calls.css"), "utf8"),
  ].join("\n");
  const provider = mods.livekit.createLiveKitProvider({ url: `ws://127.0.0.1:${LK_PORT}`, apiKey: API_KEY, apiSecret: API_SECRET });

  /* The database: the real VC1 SQL on PGlite, over the stand-ins. */
  const { vc1Database } = await import(pathToFileURL(join(here, "pglite-probe.mjs")).href);
  const db = await vc1Database(PGLITE);
  await db.exec("update public.feature_flags set enabled = true where key in ('video_calls', 'admin_review_calls');");
  const conv = (await db.query("insert into public.conversations (guest_id, agent_id) values ($1, $2) returning id", [MEMBER, HOST])).rows[0].id;
  await db.query("insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'Happy to show you round on video.')", [conv, HOST]);
  const rpc = async (who, fn, args) =>
    db.transaction(async (tx) => {
      if (who === "service") {
        await tx.query("select set_config('request.jwt.claims', '{\"role\":\"service_role\"}', true)");
      } else {
        await tx.query("set local role authenticated");
        await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: who, role: "authenticated" })]);
      }
      const names = Object.keys(args);
      const sql = `select public.${fn}(${names.map((n, i) => `${n} => $${i + 1}`).join(", ")}) as r`;
      try {
        const res = await tx.query(sql, names.map((n) => args[n]));
        return { ok: true, data: res.rows[0].r };
      } catch (e) {
        return { ok: false, words: mods.errors.callErrorWords({ message: e.message }), token: e.message };
      }
    });

  /* The action shim: the same function per action, the same answers. */
  const USER = { A: MEMBER, B: HOST };
  const snap = (answer) => {
    if (!answer.ok) return { ok: false, error: answer.words };
    const s = mods.lifecycle.snapshotFromRow(answer.data);
    return s ? { ok: true, data: s } : { ok: false, error: mods.errors.wordsForToken("call:not_found") };
  };
  const actions = {
    startCall: (who, i) => rpc(USER[who], "call_start", { p_conversation: i.conversationId, p_kind: i.kind, p_client_key: i.tapKey ?? null }).then(snap),
    acceptCall: (who, i) => rpc(USER[who], "call_accept", { p_call: i.callId }).then(snap),
    declineCall: (who, i) => rpc(USER[who], "call_decline", { p_call: i.callId }).then(snap),
    cancelCall: (who, i) => rpc(USER[who], "call_cancel", { p_call: i.callId }).then(snap),
    endCall: async (who, i) => {
      const answer = snap(await rpc(USER[who], "call_end", { p_call: i.callId }));
      /* The action closes a finished room after replying (closeRoomsSoon). */
      setTimeout(async () => {
        const room = (await db.query("select provider_room, state from public.calls where id = $1", [i.callId])).rows[0];
        if (room?.provider_room && ["ENDED", "CANCELLED", "DECLINED", "MISSED", "FAILED"].includes(room.state)) await provider.endRoom(room.provider_room).catch(() => undefined);
      }, 50);
      return answer;
    },
    heartbeatCall: (who, i) => rpc(USER[who], "call_heartbeat", { p_call: i.callId }).then(snap),
    getJoinCredentials: async (who, i) => {
      const issued = await mods.tokens.issueJoinCredentials({ joinCheck: (id) => rpc(USER[who], "call_join_check", { p_call: id }), provider }, i.callId);
      return issued.ok ? { ok: true, data: issued.credentials } : { ok: false, error: issued.error };
    },
  };
  const actionLog = [];

  const page = (bundle, vars) => `<!doctype html><html lang="en" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>${css}</style></head><body><div id="root"></div><script>${vars}</script><script>${bundle}</script></body></html>`;
  const http = createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString("utf8");
    if (req.method === "POST" && req.url === "/webhook") {
      const verdict = await mods.webhook.handleProviderWebhook(
        { provider, record: (event) => rpc("service", "call_provider_event", mods.webhook.providerEventArgs(event)) },
        raw,
        req.headers.authorization ?? null,
      );
      res.writeHead(verdict.status, { "content-type": "application/json" });
      res.end(JSON.stringify(verdict));
      return;
    }
    const m = /^\/rpc\/(\w+)$/.exec(req.url ?? "");
    if (req.method === "POST" && m && actions[m[1]]) {
      const who = req.headers["x-who"] === "B" ? "B" : "A";
      const input = raw ? JSON.parse(raw) : {};
      actionLog.push([who, m[1]]);
      const answer = await actions[m[1]](who, input).catch((e) => ({ ok: false, error: String(e?.message ?? e) }));
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(answer));
      return;
    }
    if ((req.url ?? "").startsWith("/a.html")) {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(page(bundles.caller, `window.__conv=${JSON.stringify(conv)};`));
      return;
    }
    if ((req.url ?? "").startsWith("/b.html")) {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(page(bundles.callee, `window.__me=${JSON.stringify(HOST)};`));
      return;
    }
    res.writeHead(404);
    res.end();
  });
  await new Promise((r) => http.listen(HTTP_PORT, "127.0.0.1", r));
  const lk = startLiveKit(`http://127.0.0.1:${HTTP_PORT}/webhook`);

  const { chromium } = await import(pathToFileURL(join(root, "node_modules/playwright-core/index.mjs")).href);
  let browser;
  try {
    const up = await until(async () => {
      try {
        return (await fetch(`http://127.0.0.1:${LK_PORT}/`)).ok;
      } catch {
        return false;
      }
    }, 15_000);
    /* Our own child must be the one answering: a server from an earlier run
       still shutting down would answer the probe with another key. */
    const ours = !!up && lk.child.exitCode === null && !/address already in use/i.test(lk.log());
    check("livekit-server started (this run's own process)", ours, ours ? "" : lk.log().slice(-300));
    if (!ours) return;

    browser = await chromium.launch({
      executablePath: CHROME,
      args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required", "--no-sandbox"],
    });
    const errors = [];
    const open = async (path) => {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ["camera", "microphone"] });
      const p = await ctx.newPage();
      p.on("pageerror", (e) => errors.push(`${path}: ${e.message}`));
      await p.goto(`http://127.0.0.1:${HTTP_PORT}${path}`);
      return p;
    };

    /* ---- A taps Video call in the thread ---- */
    const A = await open("/a.html");
    await A.getByTestId("thread-call-video").click();
    const ringing = await until(async () => (await A.getByTestId("call-outgoing").count()) > 0 && (await A.getByText("Ringing").count()) > 0, 15_000);
    check("A: the thread's video button opens the outgoing screen, Ringing", !!ringing);
    const call = (await db.query("select id, state, kind from public.calls order by created_at desc limit 1")).rows[0];
    check("the database rang the host (call_start, VIDEO)", call?.state === "RINGING" && call?.kind === "VIDEO", call?.state);
    const startTaps = actionLog.filter(([w, n]) => w === "A" && n === "startCall").length;
    check("one tap, one startCall", startTaps === 1, String(startTaps));

    /* ---- B opens the push link ---- */
    const B = await open(`/b.html?call=${call.id}`);
    const incoming = await until(async () => (await B.getByTestId("call-incoming").count()) > 0, 15_000);
    check("B: the call layer resolves ?call= into the incoming screen", !!incoming);
    const stripped = await B.evaluate(() => window.location.search);
    check("B: the call id is taken out of the address", stripped === "", stripped);
    const label = await B.getByRole("dialog").getAttribute("aria-label");
    check("B: the incoming screen names the caller", /^Incoming video call: /.test(label ?? ""), label ?? "");

    /* ---- B accepts ---- */
    await B.getByTestId("call-accept").click();
    const bothVideo = await until(async () => {
      const w = async (p) =>
        p.evaluate(() => {
          const v = document.querySelector('[data-testid="call-remote-video"]');
          return v ? v.videoWidth : 0;
        });
      const [a, b] = [await w(A), await w(B)];
      return a > 0 && b > 0 ? { a, b } : null;
    }, 30_000, 500);
    check("both in-call screens show the other's decoded video", !!bothVideo, bothVideo ? `A ${bothVideo.a}px, B ${bothVideo.b}px` : errors.slice(-2).join(" | "));
    const active = await until(async () => (await db.query("select state from public.calls where id = $1", [call.id])).rows[0].state === "ACTIVE", 20_000);
    check("the database says ACTIVE (provider webhooks)", !!active);
    const clock = await until(async () => {
      const t = await A.locator(".nf-call__clock").textContent().catch(() => "");
      return /^\d+:\d\d$/.test((t ?? "").trim()) && (t ?? "").trim() !== "0:00" ? t.trim() : null;
    }, 15_000);
    check("A: the call clock runs on the server's time", !!clock, clock ?? "");

    /* ---- A mutes; B hears about it ---- */
    await A.getByTestId("call-mic").click();
    const mutedA = await A.getByTestId("call-mic").getAttribute("aria-pressed");
    const bannerB = await until(async () => (await B.locator('[data-banner="remote_muted"]').count()) > 0, 10_000);
    check("A mutes: A's control says so, B sees the muted line", mutedA === "true" && !!bannerB);
    await A.getByTestId("call-mic").click();

    /* ---- A's camera off and on ---- */
    await A.getByTestId("call-camera").click();
    const placeholder = await until(async () => (await B.getByTestId("call-remote-video").count()) === 0, 10_000);
    check("A turns the camera off: B's stage shows the placeholder", !!placeholder);
    await A.getByTestId("call-camera").click();
    const back = await until(async () => B.evaluate(() => (document.querySelector('[data-testid="call-remote-video"]')?.videoWidth ?? 0) > 0), 15_000, 500);
    check("A turns it back on: B decodes A's video again", !!back);

    /* ---- B ends ---- */
    await B.getByTestId("call-end").click();
    const endedB = await until(async () => (await B.getByTestId("call-ended").count()) > 0, 15_000);
    check("B ends: B sees the ended screen", !!endedB);
    const endedA = await until(async () => (await A.getByTestId("call-ended").count()) > 0, 25_000);
    check("A sees the ended screen too (room closed, heartbeat)", !!endedA);
    const words = await A.getByTestId("call-ended").getAttribute("aria-label");
    check("A's ended screen says how it ended", /^Call ended: /.test(words ?? ""), words ?? "");
    const row = (await db.query("select state, duration_seconds from public.calls where id = $1", [call.id])).rows[0];
    check("the database says ENDED with a duration", row.state === "ENDED" && row.duration_seconds !== null, `${row.state}, ${row.duration_seconds} s`);
    const markers = (await db.query("select body from public.messages where call_id = $1", [call.id])).rows;
    check("the thread holds exactly one call marker", markers.length === 1, markers[0]?.body ?? "none");
    const tracksLive = await A.evaluate(() => document.querySelectorAll("video").length);
    check("A: no video element left on the ended screen", tracksLive === 0, String(tracksLive));

    /* ---- A second call, answered on a device that refuses the camera ---- */
    await A.getByRole("button", { name: "Close" }).click();
    await A.getByTestId("thread-call-voice").click();
    await until(async () => (await A.getByTestId("call-outgoing").count()) > 0, 15_000);
    const second = (await db.query("select id, kind from public.calls order by created_at desc limit 1")).rows[0];
    check("A starts a voice call from the same thread", second.kind === "AUDIO" && second.id !== call.id, second.kind);
    /* No fake-media consent and no granted permission: getUserMedia is refused. */
    const strict = await chromium.launch({ executablePath: CHROME, args: ["--use-fake-device-for-media-stream", "--deny-permission-prompts", "--no-sandbox"] });
    try {
      const ctx = await strict.newContext({ viewport: { width: 390, height: 844 } });
      const D = await ctx.newPage();
      D.on("pageerror", (e) => errors.push(`denied: ${e.message}`));
      await D.goto(`http://127.0.0.1:${HTTP_PORT}/b.html?call=${second.id}`);
      await until(async () => (await D.getByTestId("call-incoming").count()) > 0, 15_000);
      await D.getByTestId("call-accept").click();
      const denied = await until(async () => (await D.getByTestId("call-permission").count()) > 0, 15_000);
      const steps = await D.getByTestId("call-permission-steps").locator("li").count().catch(() => 0);
      check("B on a refusing device: the permission screen, with the steps for its platform", !!denied && steps >= 3, `${steps} steps`);
      const joinedWithout = actionLog.filter(([w, n]) => w === "B" && n === "getJoinCredentials").length;
      check("no join token was asked for without the microphone", joinedWithout === 1, `${joinedWithout} token requests by B in total`);
      await D.getByRole("button", { name: "Keep messaging instead" }).click();
      const over = await until(async () => {
        const s = (await db.query("select state from public.calls where id = $1", [second.id])).rows[0].state;
        return ["ENDED", "FAILED"].includes(s) ? s : null;
      }, 10_000);
      check("Keep messaging ends the call cleanly", !!over, over ?? "");
      const endedA2 = await until(async () => (await A.getByTestId("call-ended").count()) > 0, 25_000);
      check("A learns the call is over", !!endedA2);
    } finally {
      await strict.close();
    }
    check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  } finally {
    if (browser) await browser.close();
    lk.child.kill("SIGTERM");
    /* Wait for it to go, so the next run never meets this run's server. */
    await new Promise((resolve) => {
      if (lk.child.exitCode !== null) return resolve();
      const force = setTimeout(() => lk.child.kill("SIGKILL"), 5_000);
      lk.child.once("exit", () => {
        clearTimeout(force);
        resolve();
      });
    });
    http.close();
    await db.close?.();
    rmSync(out, { recursive: true, force: true });
  }
}

try {
  await main();
} catch (error) {
  /* A step that could not even be attempted is a failure in the report, not a crash. */
  check("the run reached its end", false, String(error?.message ?? error).split("\n")[0]);
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 && results.length > 0 ? 0 : 1);
