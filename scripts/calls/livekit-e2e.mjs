#!/usr/bin/env node
/**
 * VC1, A REAL MEDIA CALL ON THIS MACHINE.
 *
 * Starts the open-source `livekit-server` on 127.0.0.1 with a key pair made
 * up for this run, mints tokens with VALLO'S OWN token service and LiveKit
 * adapter (`apps/web/src/lib/calls/`, bundled with esbuild, nothing
 * reimplemented here), opens two headless Chromium pages with fake camera
 * and microphone devices, and asserts that each page receives and decodes
 * the other's audio AND video. It also checks what a voice-call token may
 * not do (publish a camera), that a token signed with another secret is
 * refused, and that the server's own webhooks pass Vallo's signature check.
 *
 * WITH VC_PGLITE_MODULE SET, the call also runs through the REAL VC1 SQL
 * (on PGlite over the stand-ins in fixtures/): call_start, call_accept and
 * call_join_check decide the room and identities, the server's webhooks go
 * through Vallo's webhook handler into call_provider_event, and the script
 * asserts the call becomes ACTIVE, INTERRUPTED on a drop, ACTIVE again on
 * the rejoin, ENDED on hang up with one conversation marker, that a replayed
 * webhook is a duplicate and a forged one is refused. PostgREST, Next.js and
 * Supabase Auth are not in this loop; the SQL and the media are.
 *
 * What this is NOT: a phone, a native shell, a mobile network, LiveKit Cloud
 * or production. Never report it as any of those.
 *
 *   LIVEKIT_SERVER_BIN=/path/to/livekit-server \
 *   VC_LIVEKIT_CLIENT_UMD=/path/to/livekit-client/dist/livekit-client.umd.js \
 *   VC_CHROMIUM=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
 *   [VC_PGLITE_MODULE=/path/to/@electric-sql/pglite/dist/index.js] \
 *     node scripts/calls/livekit-e2e.mjs
 *
 * livekit-server: a release binary, or `go build ./cmd/server` from the
 * module source (github.com/livekit/livekit-server). livekit-client: the
 * npm package's UMD bundle (`npm pack livekit-client@2.22.3`). Neither is a
 * dependency of this repository. No secret is read or written: the key pair
 * is random per run and dies with the server.
 */
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const web = join(root, "apps", "web");

const BIN = process.env.LIVEKIT_SERVER_BIN || "livekit-server";
const UMD = process.env.VC_LIVEKIT_CLIENT_UMD;
const CHROME = process.env.VC_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const PGLITE = process.env.VC_PGLITE_MODULE || "";
const LK_PORT = Number(process.env.VC_LIVEKIT_PORT || 7880);
const HTTP_PORT = Number(process.env.VC_HTTP_PORT || 7899);

const API_KEY = `APIe2e${randomBytes(4).toString("hex")}`;
const API_SECRET = randomBytes(32).toString("hex");
const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms, every = 200) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = await fn();
    if (v) return v;
    await sleep(every);
  }
  return null;
}

/* ---------------------------------------------------------------- bundle */

async function bundleCallsModules(out) {
  const { build } = await import(pathToFileURL(join(root, "node_modules/esbuild/lib/main.js")).href);
  const empty = join(out, "empty.mjs");
  writeFileSync(empty, "export {};\n");
  await build({
    entryPoints: {
      livekit: join(web, "src/lib/calls/provider/livekit.ts"),
      tokens: join(web, "src/lib/calls/token-service.ts"),
      webhook: join(web, "src/lib/calls/webhook.ts"),
      lifecycle: join(web, "src/lib/calls/lifecycle.ts"),
    },
    outdir: out,
    bundle: true,
    platform: "node",
    format: "esm",
    outExtension: { ".js": ".mjs" },
    alias: { "server-only": empty },
    logLevel: "error",
  });
  return {
    livekit: await import(pathToFileURL(join(out, "livekit.mjs")).href),
    tokens: await import(pathToFileURL(join(out, "tokens.mjs")).href),
    webhook: await import(pathToFileURL(join(out, "webhook.mjs")).href),
  };
}

/* ----------------------------------------------------------- the database */

const MEMBER = "957b3bd2-cce3-425d-bba9-5cd876ca3d62";
const HOST = "03f3dd52-ea28-4852-9abe-e5b0a67c2a43";

async function openDatabase() {
  if (!PGLITE) return null;
  const { vc1Database } = await import(pathToFileURL(join(here, "pglite-probe.mjs")).href);
  const db = await vc1Database(PGLITE);
  await db.exec("update public.feature_flags set enabled = true where key in ('video_calls', 'admin_review_calls');");
  const conv = (await db.query("insert into public.conversations (guest_id, agent_id) values ($1, $2) returning id", [MEMBER, HOST])).rows[0].id;
  await db.query("insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'Happy to show you round on video.')", [conv, HOST]);
  /** One RPC as a signed-in person (or the service role), the way PostgREST runs it. */
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
        return { ok: false, token: e.message, words: e.message, code: e.code ?? null };
      }
    });
  const state = async (id) => (await db.query("select state, reconnect_count from public.calls where id = $1", [id])).rows[0];
  return { db, conv, rpc, state };
}

/* --------------------------------------------------------------- servers */

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
  const child = spawn(BIN, ["--bind", "127.0.0.1", "--node-ip", "127.0.0.1", "--config-body", config], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  child.stdout.on("data", (d) => (log += d));
  child.stderr.on("data", (d) => (log += d));
  return { child, log: () => log };
}

function startHttp({ webhook, page }) {
  const server = createServer(async (req, res) => {
    if (req.method === "POST" && req.url === "/webhook") {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const raw = Buffer.concat(chunks).toString("utf8");
      const verdict = await webhook(raw, req.headers.authorization ?? null);
      res.writeHead(verdict.status, { "content-type": "application/json" });
      res.end(JSON.stringify(verdict));
      return;
    }
    if (req.url === "/livekit-client.umd.js") {
      res.writeHead(200, { "content-type": "text/javascript" });
      res.end(readFileSync(UMD));
      return;
    }
    if (req.url === "/call.html") {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(page);
      return;
    }
    res.writeHead(404);
    res.end();
  });
  return new Promise((resolve) => server.listen(HTTP_PORT, "127.0.0.1", () => resolve(server)));
}

/* The page: a bare livekit-client room, publishing the fake devices and
   recording what it receives. No Vallo UI; that is the frontend's. */
const PAGE = `<!doctype html><meta charset="utf-8"><title>VC1 e2e</title>
<script src="/livekit-client.umd.js"></script>
<script>
  window.got = { audio: false, video: false, videoWidth: 0, audioBytes: 0, disconnected: null };
  window.joinCall = async (url, token, publishCamera) => {
    const { Room, RoomEvent } = LivekitClient;
    const room = new Room({ adaptiveStream: false, dynacast: false });
    window.room = room;
    room.on(RoomEvent.TrackSubscribed, (track) => {
      window.got[track.kind] = true;
      const el = track.attach();
      el.muted = true;
      el.autoplay = true;
      el.playsInline = true;
      document.body.appendChild(el);
      if (track.kind === "video") window.videoEl = el;
      if (track.kind === "audio") window.audioTrack = track;
    });
    room.on(RoomEvent.Disconnected, (reason) => { window.got.disconnected = String(reason); });
    await room.connect(url, token);
    await room.localParticipant.setMicrophoneEnabled(true);
    let cameraError = null;
    if (publishCamera) {
      try { await room.localParticipant.setCameraEnabled(true); } catch (e) { cameraError = String(e && e.message || e); }
    }
    return { identity: room.localParticipant.identity, name: room.name, cameraError };
  };
  window.tryCamera = async () => {
    try { await window.room.localParticipant.setCameraEnabled(true); return null; } catch (e) { return String(e && e.message || e); }
  };
  window.measure = async () => {
    if (window.videoEl) window.got.videoWidth = window.videoEl.videoWidth;
    if (window.audioTrack) {
      const report = await window.audioTrack.getRTCStatsReport();
      report && report.forEach((s) => { if (s.type === "inbound-rtp" && s.kind === "audio") window.got.audioBytes = s.bytesReceived; });
    }
    return window.got;
  };
</script>`;

/* ------------------------------------------------------------------- run */

async function main() {
  if (!UMD) {
    console.error("Set VC_LIVEKIT_CLIENT_UMD (see the header of this file).");
    process.exit(2);
  }
  /* The bundle goes to VC_OUT_DIR when set. Do NOT point TMPDIR at a long
     path for Chromium: its profile sockets then fail and it exits with SIGTRAP. */
  const out = mkdtempSync(join(process.env.VC_OUT_DIR || tmpdir(), "vallo-vc1-e2e-"));
  const mods = await bundleCallsModules(out);
  const provider = mods.livekit.createLiveKitProvider({ url: `ws://127.0.0.1:${LK_PORT}`, apiKey: API_KEY, apiSecret: API_SECRET });
  const data = await openDatabase();
  console.log(`mode: ${data ? "real VC1 SQL on PGlite + real livekit-server + real Chromium" : "real livekit-server + real Chromium, join check simulated"}`);

  const webhooks = [];
  const handle = async (raw, auth) => {
    const verdict = await mods.webhook.handleProviderWebhook(
      {
        provider,
        record: async (event) => {
          webhooks.push({ event, raw, auth });
          if (!data) return { ok: true, data: { duplicate: false } };
          return data.rpc("service", "call_provider_event", mods.webhook.providerEventArgs(event));
        },
      },
      raw,
      auth,
    );
    if (verdict.status === 401) webhooks.push({ forged: true });
    return verdict;
  };
  const http = await startHttp({ webhook: handle, page: PAGE });
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
    check("livekit-server started", !!up, up ? "" : lk.log().slice(-400));
    if (!up) return;

    browser = await chromium.launch({
      executablePath: CHROME,
      args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"],
    });
    const pageA = await (await browser.newContext()).newPage();
    const pageB = await (await browser.newContext()).newPage();
    for (const p of [pageA, pageB]) await p.goto(`http://127.0.0.1:${HTTP_PORT}/call.html`);

    /* ---- the call, decided by the database when there is one ---- */
    let callId = randomUUID();
    let joinCheck;
    if (data) {
      const started = await data.rpc(MEMBER, "call_start", { p_conversation: data.conv, p_kind: "VIDEO", p_client_key: randomUUID() });
      check("call_start rings the host (SQL)", started.ok && started.data.state === "RINGING", started.ok ? started.data.state : started.words);
      callId = started.data.id;
      joinCheck = (who) => (id) => data.rpc(who, "call_join_check", { p_call: id });
    } else {
      const room = `vc_${randomBytes(16).toString("hex")}`;
      const fake = (identity, role) => async () => ({
        ok: true,
        data: { call_id: callId, state: "ACCEPTED", kind: "VIDEO", role, room, identity, display_name: role, can_publish_video: true },
      });
      const ids = { [MEMBER]: `vp_${randomBytes(16).toString("hex")}`, [HOST]: `vp_${randomBytes(16).toString("hex")}` };
      joinCheck = (who) => fake(ids[who], who === MEMBER ? "CALLER" : "CALLEE");
    }

    const issueA = await mods.tokens.issueJoinCredentials({ joinCheck: joinCheck(MEMBER), provider }, callId);
    check("token service issues the caller's credentials", issueA.ok, issueA.ok ? "" : issueA.error);
    const joinedA = await pageA.evaluate(([u, t]) => window.joinCall(u, t, true), [issueA.credentials.serverUrl, issueA.credentials.token]);
    check("caller connects with a Vallo-minted token", !!joinedA.identity && !joinedA.cameraError, `${joinedA.identity} in ${joinedA.name}`);

    if (data) {
      const notYet = await data.rpc(HOST, "call_join_check", { p_call: callId });
      check("the host cannot join before answering (SQL)", !notYet.ok && notYet.words === "call:not_joinable", notYet.words ?? "joined");
      const accepted = await data.rpc(HOST, "call_accept", { p_call: callId });
      check("call_accept (SQL)", accepted.ok && accepted.data.state === "ACCEPTED");
    }
    const issueB = await mods.tokens.issueJoinCredentials({ joinCheck: joinCheck(HOST), provider }, callId);
    check("token service issues the host's credentials", issueB.ok, issueB.ok ? "" : issueB.error);
    const joinedB = await pageB.evaluate(([u, t]) => window.joinCall(u, t, true), [issueB.credentials.serverUrl, issueB.credentials.token]);
    check("host connects to the same room", joinedB.name === joinedA.name && !joinedB.cameraError, joinedB.name);

    const media = await until(async () => {
      const a = await pageA.evaluate(() => window.measure());
      const b = await pageB.evaluate(() => window.measure());
      return a.audio && a.video && b.audio && b.video && a.videoWidth > 0 && b.videoWidth > 0 && a.audioBytes > 0 && b.audioBytes > 0 ? { a, b } : null;
    }, 20_000, 500);
    const a = await pageA.evaluate(() => window.measure());
    const b = await pageB.evaluate(() => window.measure());
    check("caller receives and decodes the host's video", a.video && a.videoWidth > 0, `videoWidth ${a.videoWidth}`);
    check("caller receives the host's audio", a.audio && a.audioBytes > 0, `${a.audioBytes} audio bytes`);
    check("host receives and decodes the caller's video", b.video && b.videoWidth > 0, `videoWidth ${b.videoWidth}`);
    check("host receives the caller's audio", b.audio && b.audioBytes > 0, `${b.audioBytes} audio bytes`);
    if (!media) console.log("media did not fully arrive within 20 s");

    /* The room service (Twirp) with Vallo's server-side admin token. */
    const present = await provider.listParticipants(joinedA.name).catch((e) => `error: ${e.message}`);
    check(
      "the room service lists exactly the two identities (Vallo's admin token, Twirp)",
      Array.isArray(present) && present.length === 2 && present.includes(joinedA.identity) && present.includes(joinedB.identity),
      Array.isArray(present) ? `${present.length} present` : present,
    );

    const signedJoins = await until(() => webhooks.filter((w) => w.event?.event === "participant_joined").length >= 2, 10_000);
    check("the server's participant_joined webhooks pass Vallo's signature check", !!signedJoins, `${webhooks.length} verified deliveries`);

    if (data) {
      const active = await until(async () => (await data.state(callId)).state === "ACTIVE", 10_000);
      check("both joins make the call ACTIVE (SQL, from webhooks)", !!active, (await data.state(callId)).state);

      /* A replayed delivery and a forged one. */
      const sample = webhooks.find((w) => w.event?.event === "participant_joined");
      const replay = await handle(sample.raw, sample.auth);
      check("a replayed webhook is answered as a duplicate", replay.outcome === "duplicate", replay.outcome);
      const forged = await handle(sample.raw, sample.auth.slice(0, -4) + "AAAA");
      check("a forged webhook is refused", forged.status === 401, String(forged.status));

      /* A drop, then a rejoin inside the grace. */
      await pageB.evaluate(() => window.room.disconnect());
      const interrupted = await until(async () => (await data.state(callId)).state === "INTERRUPTED", 10_000);
      check("a dropped connection makes the call INTERRUPTED, not ended", !!interrupted, (await data.state(callId)).state);
      const again = await mods.tokens.issueJoinCredentials({ joinCheck: joinCheck(HOST), provider }, callId);
      await pageB.evaluate(([u, t]) => window.joinCall(u, t, true), [again.credentials.serverUrl, again.credentials.token]);
      const back = await until(async () => {
        const s = await data.state(callId);
        return s.state === "ACTIVE" && s.reconnect_count === 1;
      }, 10_000);
      check("rejoining inside the grace makes it ACTIVE again", !!back, JSON.stringify(await data.state(callId)));

      /* Hang up, close the room, and the marker. */
      const ended = await data.rpc(MEMBER, "call_end", { p_call: callId });
      check("call_end ends it (SQL)", ended.ok && ended.data.state === "ENDED", ended.ok ? `${ended.data.duration_seconds} s` : ended.words);
      const room = (await data.db.query("select provider_room from public.calls where id = $1", [callId])).rows[0].provider_room;
      await provider.endRoom(room);
      const kicked = await until(async () => (await pageA.evaluate(() => window.got.disconnected)) !== null, 10_000);
      check("closing the room disconnects whoever is still in it", !!kicked);
      const markers = (await data.db.query("select body from public.messages where call_id = $1", [callId])).rows;
      check("the conversation holds exactly one call marker", markers.length === 1, markers[0]?.body ?? "none");
      const late = await data.rpc(HOST, "call_join_check", { p_call: callId });
      check("no token for an ended call", !late.ok, late.words ?? "issued");
    } else {
      await pageA.evaluate(() => window.room.disconnect());
      await pageB.evaluate(() => window.room.disconnect());
    }

    /* ---- what a voice-call token may not do ---- */
    const voiceRoom = `vc_${randomBytes(16).toString("hex")}`;
    const prepared = await provider
      .prepareRoom(voiceRoom, { maxParticipants: 3, emptyTimeoutSeconds: 60 })
      .then(() => null)
      .catch((e) => e.message);
    check("the room service creates a capped room ahead of the first join", prepared === null, prepared ?? "");
    const voice = await provider.issueParticipantCredentials({
      room: voiceRoom,
      identity: `vp_${randomBytes(16).toString("hex")}`,
      displayName: "Voice",
      canPublishVideo: false,
      ttlSeconds: 120,
    });
    const pageC = await (await browser.newContext()).newPage();
    await pageC.goto(`http://127.0.0.1:${HTTP_PORT}/call.html`);
    const joinedC = await pageC.evaluate(([u, t]) => window.joinCall(u, t, false), [voice.serverUrl, voice.token]);
    const cameraRefused = await pageC.evaluate(() => window.tryCamera());
    check("a voice-call token connects with its microphone", !!joinedC.identity);
    check("a voice-call token cannot publish a camera (the server refuses)", cameraRefused !== null, cameraRefused ?? "camera published");
    await pageC.evaluate(() => window.room.disconnect());

    /* ---- a token signed with another secret ---- */
    const impostor = mods.livekit.createLiveKitProvider({ url: `ws://127.0.0.1:${LK_PORT}`, apiKey: API_KEY, apiSecret: randomBytes(32).toString("hex") });
    const bad = await impostor.issueParticipantCredentials({ room: voiceRoom, identity: `vp_${randomBytes(16).toString("hex")}`, displayName: "x", canPublishVideo: true, ttlSeconds: 120 });
    const pageD = await (await browser.newContext()).newPage();
    await pageD.goto(`http://127.0.0.1:${HTTP_PORT}/call.html`);
    const refused = await pageD.evaluate(async ([u, t]) => {
      try {
        await window.joinCall(u, t, false);
        return null;
      } catch (e) {
        return String(e && e.message || e);
      }
    }, [bad.serverUrl, bad.token]);
    check("a token signed with the wrong secret is refused by the server", refused !== null, refused?.slice(0, 80) ?? "connected");
  } finally {
    if (browser) await browser.close();
    lk.child.kill("SIGTERM");
    http.close();
    rmSync(out, { recursive: true, force: true });
  }
}

await main();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 && results.length > 0 ? 0 : 1);
