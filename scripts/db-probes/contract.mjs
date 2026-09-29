/**
 * The contract every database probe in `supabase/tests/probes/` keeps, and the
 * rule that turns a probe's run into PASS or FAIL.
 *
 * Kept free of I/O so the unit suite (no database) can hold both halves:
 * `apps/web/src/lib/db-probes/contract.test.ts` checks every probe file against
 * `checkProbeSource` and pins `judgeRun` against the outcomes that matter.
 *
 * A PROBE IS ONE `do $$ ... $$;` BLOCK THAT ALWAYS RAISES.
 *   - success is `raise exception 'PROBE_OK <id>'`, where <id> is the file's
 *     own name without `.sql` (case-insensitive), so a probe copied from
 *     another cannot pass under the wrong name;
 *   - failure is `raise exception 'PROBE_FAIL <id>: <what>'`;
 *   - because it always raises, it always rolls back. The runner still wraps
 *     each file in `begin; ... rollback;` so a probe that forgot to raise
 *     cannot commit, and that probe is judged FAIL (no PROBE_OK was seen).
 *
 * A run PASSES only when the client exited non-zero AND an `ERROR:` line
 * carries `PROBE_OK <id>` (a NOTICE never counts), and nothing else went wrong. Every other outcome is a failure, including a probe
 * that finished without raising, a syntax error, a timeout and a `PROBE_OK`
 * for a different id. There is no "skipped": a probe that cannot run is red.
 */

/** The probe id for a file path: its basename without `.sql`, lower-cased. */
export function probeIdFromPath(path) {
  const base = String(path).split(/[\\/]/).pop() ?? "";
  return base.replace(/\.sql$/i, "").toLowerCase();
}

/** Strip `--` line comments and C-style block comments, keeping string literals intact enough for a shape check. */
function withoutSqlComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
}

/**
 * Problems with a probe file's shape, or an empty list when it keeps the
 * contract. Reads source text only: it cannot know whether the assertions
 * inside are right, only that the file cannot commit and can report both ways.
 */
export function checkProbeSource(path, sql) {
  const id = probeIdFromPath(path);
  const problems = [];
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(id)) {
    problems.push(`file name "${id}" is not a lower-case probe id (e.g. db-01.sql)`);
  }
  const code = withoutSqlComments(sql).trim();
  if (!/^do\s+\$([a-z_]*)\$/i.test(code)) {
    problems.push("does not start with a `do $$` block");
  }
  // Exactly one top-level statement: the DO block, optionally followed by `;`.
  const tag = /^do\s+(\$[a-z_]*\$)/i.exec(code)?.[1];
  if (tag) {
    const first = code.indexOf(tag);
    const second = code.indexOf(tag, first + tag.length);
    const rest = second === -1 ? "" : code.slice(second + tag.length).trim();
    if (second === -1) problems.push(`the ${tag} block is never closed`);
    else if (!/^;?$/.test(rest)) problems.push("has statements after the DO block (a probe is ONE block)");
  }
  if (!new RegExp(`raise\\s+exception\\s+'PROBE_OK\\s+${escapeRe(id)}\\b`, "i").test(code)) {
    problems.push(`never raises 'PROBE_OK ${id}' (the success line must name this file)`);
  }
  if (!/PROBE_FAIL/.test(code)) {
    problems.push("has no PROBE_FAIL branch, so it cannot report a failure by name");
  }
  if (/\bdblink\w*\s*\(|\bnet\s*\.\s*http_\w+\s*\(/i.test(code)) {
    problems.push("calls dblink or pg_net, which act outside the probe's transaction and are never rolled back");
  }
  if (/\bcommit\s*;/i.test(code)) {
    problems.push("contains COMMIT: a probe must never be able to keep what it did");
  }
  return problems;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Judge one run. `output` is everything the client printed (stdout + stderr),
 * `exitCode` its exit status. Returns `{ ok, reason }`.
 */
export function judgeRun(id, output, exitCode) {
  const text = String(output ?? "");
  // PROBE_OK counts only as the server's ERROR (the probe's closing `raise
  // exception`), never as a NOTICE or any other line, and only when the client
  // exited non-zero. `raise notice 'PROBE_OK <id>'` followed by a normal end
  // would otherwise pass while asserting nothing.
  const okRe = new RegExp(
    `^(?:psql:[^:\\n]*:\\d+:\\s*)?(?:Failed to apply database migration:\\s*)?ERROR:\\s+(?:[A-Z0-9]{5}:\\s+)?PROBE_OK\\s+${escapeRe(id)}(?![A-Za-z0-9_-])`,
    "im",
  );
  const fail = /PROBE_FAIL[^\n]*/.exec(text);
  if (fail) return { ok: false, reason: fail[0].trim() };
  if (exitCode !== 0 && okRe.test(text)) return { ok: true, reason: `PROBE_OK ${id}` };
  const other = /ERROR:\s+(?:[A-Z0-9]{5}:\s+)?PROBE_OK\s+([A-Za-z0-9_-]+)/.exec(text);
  if (other && other[1].toLowerCase() !== id.toLowerCase()) {
    return { ok: false, reason: `raised PROBE_OK ${other[1]}, not PROBE_OK ${id}: the success line names another probe` };
  }
  if (exitCode === 0) {
    return { ok: false, reason: "finished without raising: no PROBE_OK error was seen (rolled back by the runner)" };
  }
  const err = /ERROR:[^\n]*/.exec(text);
  if (err) return { ok: false, reason: err[0].trim() };
  // A client that never reached the server prints `psql: error: ...`, not an
  // ERROR line. Say that, so 60 probes do not fail with nothing to go on.
  const client = connectionError(text);
  return { ok: false, reason: client ?? `client exited ${exitCode} with no PROBE_OK` };
}

/**
 * The connection string as it should be used. A secret pasted with a trailing
 * newline (which a text box or `echo` easily adds) would otherwise become part
 * of the database name, and every probe would fail to connect. Whitespace is
 * never meaningful in a connection URI, so it is trimmed from both ends.
 */
export function normaliseDatabaseUrl(raw) {
  return String(raw ?? "").trim();
}

/** The first client-side connection error psql printed, or null. */
export function connectionError(output) {
  const line = /^psql: error:[^\n]*(?:\n(?!psql:)[^\n]+)*/m.exec(String(output ?? ""));
  return line ? line[0].replace(/\s+/g, " ").trim() : null;
}

/**
 * Remove the password from anything about to be printed. psql does not echo
 * it, but a runner that prints client errors must not depend on that.
 */
export function redactPassword(text, url) {
  let out = String(text ?? "");
  let password = "";
  try {
    password = decodeURIComponent(new URL(url).password);
  } catch {
    password = "";
  }
  if (password.length > 0) out = out.split(password).join("***");
  return out;
}
