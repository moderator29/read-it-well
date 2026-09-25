/**
 * THE DICTIONARY NAMESPACES A MODULE'S WHOLE IMPORT GRAPH CAN READ (Track M
 * performance). Test-only: walks local imports from a root file and counts any
 * `.name` or `["name"]` that is a top-level dictionary namespace. It
 * over-approximates on purpose, see `slice-coverage.test.ts`.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { getDictionary } from "@vallo/i18n";

const SRC = join(process.cwd(), "src");
const NAMESPACES = new Set(Object.keys(getDictionary("en")));

function resolve(spec: string, from: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = normalize(join(dirname(from), spec));
  else return null;
  for (const ext of [".tsx", ".ts", "/index.tsx", "/index.ts"]) if (existsSync(base + ext)) return base + ext;
  return existsSync(base) && /\.(tsx?|js)$/.test(base) ? base : null;
}

/*
 * Property reads that share a namespace's name but are not dictionary reads,
 * tested against the text just before the dot:
 *   supabase.auth, client.auth, createClient().auth   the Supabase auth client
 *   auth.admin                                       its admin API
 *   useClientCopy().x                                the root layout's client
 *                                                    copy, not a page's `t`
 */
const NOT_A_DICTIONARY = /(?:\bsupabase|\bclient|createClient\(\)|\bauth|useClientCopy\(\))\s*$/;

/*
 * Comments can mention `profiles.settings` without reading anything. Only
 * comments that begin a line are removed: a block comment (or a JSX one) that
 * opens a line, and a whole-line `//`. Anything cleverer would have to parse
 * strings and regular expressions, and a mistake there could hide a real read
 * and let a slice pass that is too small. Leaving a trailing comment in only
 * ever over-counts, which is the safe direction.
 */
function withoutComments(source: string): string {
  return source.replace(/^[ \t]*\{?\/\*[\s\S]*?\*\/\}?/gm, "").replace(/^[ \t]*\/\/.*$/gm, "");
}

export function reachableNamespaces(root: string): Set<string> {
  const seen = new Set<string>();
  const used = new Set<string>();
  const queue = [join(SRC, root)];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const raw = readFileSync(file, "utf8");
    /* A server action never runs in the browser and is never handed `t`,
       so nothing in one can make a client slice need a namespace. */
    if (file !== join(SRC, root) && /^\s*["']use server["']/.test(raw)) continue;
    const source = withoutComments(raw);
    for (const m of source.matchAll(/\.([a-zA-Z][a-zA-Z0-9]*)\b|\[\s*["']([a-zA-Z][a-zA-Z0-9]*)["']\s*\]/g)) {
      const name = m[1] ?? m[2]!;
      if (!NAMESPACES.has(name)) continue;
      const before = source.slice(Math.max(0, m.index! - 24), m.index!);
      if (m[1] && NOT_A_DICTIONARY.test(before)) continue;
      /* `Dictionary["landing"]` is a type, erased before anything runs. */
      if (m[2] && /\bDictionary\s*$/.test(before)) continue;
      used.add(name);
    }
    /* Type-only imports are skipped: they are erased, so nothing behind them
       can read a dictionary at run time. */
    for (const m of source.matchAll(
      /(?:^|\n)\s*(?:import|export)\s+(type\s)?[^;]*?from\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g,
    )) {
      if (m[1]) continue;
      const next = resolve(m[2] ?? m[3]!, file);
      if (next && !next.includes("/node_modules/")) queue.push(next);
    }
  }
  return used;
}

