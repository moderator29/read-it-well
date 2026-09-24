import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * `listings` has two foreign keys to `agents` (agent_id, and V-99's
 * assigned_agent_id), so a bare `agents(...)` embed from a listing is
 * ambiguous and PostgREST refuses the whole read (PGRST201). That refusal is
 * what told the founder his example listings no longer existed. Every embed
 * names the key; and no error copy says a listing is gone on a failed read.
 */
const SRC = join(__dirname, "..", "..");
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === "node_modules" ? [] : files(p);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : [];
  });
}
const sources = files(SRC).map((p) => ({ p, text: readFileSync(p, "utf8") }));

describe("the listing to agent embed", () => {
  it("always names listings_agent_id_fkey", () => {
    const bare = /["`,( ]agents ?(?:!inner)?\(\s*(?:user_id|display_name|type|id)\b/;
    const offenders = sources
      .filter(({ text }) => text.split("\n").some((line) => !/^\s*(\*|\/\/)/.test(line) && bare.test(line)))
      .map(({ p }) => p.slice(SRC.length));
    expect(offenders).toEqual([]);
  });

  it("never tells a reader a listing is gone because a read failed", () => {
    const hits = sources.filter(({ text }) => /could not find this listing|may no longer be available/i.test(text.replace(/\/\*[\s\S]*?\*\//g, "")));
    expect(hits.map(({ p }) => p.slice(SRC.length))).toEqual([]);
  });
});
