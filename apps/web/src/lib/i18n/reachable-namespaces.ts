/**
 * THE DICTIONARY NAMESPACES A MODULE'S WHOLE IMPORT GRAPH CAN READ (Track M
 * performance). Test-only: walks local imports from a root file and counts any
 * `.name` or `["name"]` that is a top-level dictionary namespace. It
 * over-approximates on purpose, see `slice-coverage.test.ts`.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";
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

/** Every local module a root's run-time import graph reaches, with comment-free source. */
function reachableSources(root: string): Map<string, string> {
  const seen = new Map<string, string>();
  const queue = [join(SRC, root)];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    const raw = readFileSync(file, "utf8");
    /* A server action never runs in the browser and is never handed `t`,
       so nothing in one can make a client slice need a namespace. */
    if (file !== join(SRC, root) && /^\s*["']use server["']/.test(raw)) {
      seen.set(file, "");
      continue;
    }
    const source = withoutComments(raw);
    seen.set(file, source);
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
  return seen;
}

/** Every local module a root's run-time import graph reaches (relative to `src`), comment-free source included. */
export function reachableModules(root: string): Map<string, string> {
  return new Map([...reachableSources(root)].map(([file, source]) => [relative(SRC, file), source]));
}

export function reachableNamespaces(root: string): Set<string> {
  const used = new Set<string>();
  for (const source of reachableSources(root).values()) {
    for (const m of source.matchAll(/\.([a-zA-Z][a-zA-Z0-9]*)\b|\[\s*["']([a-zA-Z][a-zA-Z0-9]*)["']\s*\]/g)) {
      const name = m[1] ?? m[2]!;
      if (!NAMESPACES.has(name)) continue;
      const before = source.slice(Math.max(0, m.index! - 24), m.index!);
      if (m[1] && NOT_A_DICTIONARY.test(before)) continue;
      /* `Dictionary["landing"]` is a type, erased before anything runs. */
      if (m[2] && /\bDictionary\s*$/.test(before)) continue;
      used.add(name);
    }
  }
  return used;
}

/**
 * The second-level keys one namespace is read through (`t.shape.cash`), and
 * whether anything reads the namespace as a whole (`copy = t.shape`, passed
 * on, indexed by a variable). A slice may narrow a namespace to its keys only
 * when nothing reads it whole; `whole` lists where something does, so the test
 * can say so. Over-approximates like the walk above: a `.shape.x` that is not
 * a dictionary read only adds a key.
 */
export function reachableSubKeys(root: string, namespace: string): { keys: Set<string>; whole: string[] } {
  const keys = new Set<string>();
  const whole: string[] = [];
  const read = new RegExp(`\\.${namespace}(\\??\\.([a-zA-Z0-9_]+)|\\[[^\\]]*\\]|(?![A-Za-z0-9_]))`, "g");
  for (const [file, source] of reachableSources(root)) {
    for (const m of source.matchAll(read)) {
      const before = source.slice(Math.max(0, m.index! - 24), m.index!);
      if (NOT_A_DICTIONARY.test(before)) continue;
      if (m[2]) keys.add(m[2]);
      else whole.push(`${relative(SRC, file)}: ${source.slice(Math.max(0, m.index! - 30), m.index! + namespace.length + 20).replace(/\s+/g, " ")}`);
    }
  }
  return { keys, whole };
}
