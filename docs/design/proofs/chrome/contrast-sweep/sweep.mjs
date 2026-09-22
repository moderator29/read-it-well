/*
 * THE SEGMENTED CONTRAST SWEEP.
 *
 * `probe-contrast.mjs` walks every route in one process against one server.
 * Two earlier attempts at this sweep died mid-run - at 158 and then 149
 * unopened routes - and were correctly discarded, because a reading off a dead
 * server is not a reading. The fault is not the probe: it is that one long run
 * has one point of failure and no memory.
 *
 * So this drives the probe in SEGMENTS of a few routes each, one theme at a
 * time, and between every segment it asks the server whether it is alive. If
 * it is not, it restarts it and RETRIES THAT SEGMENT rather than losing the run.
 * Every segment's JSON is appended to a file on disk as it completes, so the
 * evidence survives this process too.
 *
 * A route that genuinely will not open is recorded as an error against its
 * name, twice over, and reported as a route that did not open - which is the
 * honest answer and is different from a route nobody reached.
 */
import { execFileSync, execSync } from "node:child_process";
import { readFileSync, writeFileSync, appendFileSync, existsSync } from "node:fs";

const SP = "/tmp/claude-0/-home-user-read-it-well/6683fd27-f2f3-5b70-8a27-4cc917444da7/scratchpad";
const BASE = "http://127.0.0.1:3220";
const PROBE = `${SP}/sweep-wt/apps/web/scripts/probe-contrast.mjs`;
const CWD = `${SP}/sweep-wt/apps/web`;
const OUT = process.argv[3] ?? `${SP}/sweep-results.jsonl`;
const THEME = process.argv[2];
const SEG = Number(process.argv[4] ?? 6);

const routes = JSON.parse(readFileSync(`${SP}/routes.json`, "utf8"));

const done = new Set();
if (existsSync(OUT)) {
  for (const line of readFileSync(OUT, "utf8").split("\n").filter(Boolean)) {
    const rec = JSON.parse(line);
    if (rec.theme === THEME) for (const r of rec.routes) done.add(r);
  }
}
const todo = routes.filter((r) => !done.has(r));
console.error(`[${THEME}] ${todo.length} of ${routes.length} routes left`);

function alive() {
  try {
    const code = execSync(`curl -s -o /dev/null -w "%{http_code}" ${BASE}/preview/f1/chrome`, {
      encoding: "utf8",
      timeout: 20000,
    });
    return code.trim() === "200";
  } catch {
    return false;
  }
}
function revive() {
  console.error("  server is down, restarting");
  try {
    execSync(`sh ${SP}/serve.sh`, { encoding: "utf8", timeout: 90000 });
  } catch (e) {
    console.error("  restart failed:", e.message.split("\n")[0]);
  }
}

for (let i = 0; i < todo.length; i += SEG) {
  const seg = todo.slice(i, i + SEG);
  let attempt = 0;
  for (;;) {
    attempt += 1;
    if (!alive()) revive();
    let out = "";
    try {
      out = execFileSync(
        "node",
        [PROBE, "--base", BASE, "--routes", seg.join(","), "--themes", THEME, "--json"],
        { cwd: CWD, encoding: "utf8", timeout: 600000, maxBuffer: 256 * 1024 * 1024 },
      );
    } catch (e) {
      /* The probe exits 1 whenever it finds a failure, which is most segments.
         Its JSON is still on stdout; only an empty stdout means it really died. */
      out = e.stdout ?? "";
    }
    let parsed = null;
    try {
      parsed = JSON.parse(out);
    } catch {
      parsed = null;
    }
    /*
     * A CONNECTION ERROR IS NOT A ROUTE THAT DID NOT OPEN.
     *
     * The probe catches its own navigation failures and still writes valid
     * JSON, so a segment that ran entirely against a corpse comes back looking
     * like a clean result with four "errors" in it. That is exactly how a
     * sweep reports 149 unopened routes: the server went away and the run kept
     * going. So the transport failures are separated from the real ones and
     * the segment is retried against a live server instead of being recorded.
     *
     * Other agents on this box run `pkill -f next-server`, which is almost
     * certainly what killed the two earlier attempts at this sweep and what
     * killed mine at `/preview/b1b/firm`. Restarting and retrying is the only
     * thing that survives it.
     */
    const transport =
      parsed && parsed.errors.filter((e) => /ERR_CONNECTION|ECONNREFUSED|ERR_EMPTY_RESPONSE|ERR_SOCKET/.test(e));
    if (parsed && transport.length && attempt < 4) {
      console.error(`  [${THEME}] ${transport.length} transport error(s) at ${seg[0]}, retrying`);
      revive();
      continue;
    }
    if (parsed) {
      appendFileSync(OUT, JSON.stringify({ theme: THEME, routes: seg, ...parsed }) + "\n");
      console.error(
        `  [${THEME}] ${i + seg.length}/${todo.length}  ${seg[0]} …  ` +
          `measured ${parsed.measured}, fails ${parsed.fails.length}, errors ${parsed.errors.length}`,
      );
      break;
    }
    console.error(`  [${THEME}] segment at ${seg[0]} produced no JSON (attempt ${attempt})`);
    if (attempt >= 3) {
      appendFileSync(
        OUT,
        JSON.stringify({
          theme: THEME,
          routes: seg,
          fails: [],
          onMedia: [],
          unpainted: 0,
          measured: 0,
          errors: seg.map((r) => `${THEME} ${r}: segment produced no JSON after 3 attempts`),
        }) + "\n",
      );
      break;
    }
    revive();
  }
}
console.error(`[${THEME}] done`);
