/**
 * THE DICTIONARY NAMESPACES A MODULE'S WHOLE IMPORT GRAPH CAN READ (Track M
 * performance). Test-only: walks local imports from a root file and counts any
 * `.name` or `["name"]` that is a top-level dictionary namespace. It
 * over-approximates on purpose, see `slice-coverage.test.ts`.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
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

/* ------------------------------------------------- keys read, keys that exist */

/** `withoutComments`, keeping each removed comment's line breaks so line numbers still point at the file. */
function blankComments(source: string): string {
  const blank = (text: string) => text.replace(/[^\n]/g, "");
  return source.replace(/^[ \t]*\{?\/\*[\s\S]*?\*\/\}?/gm, blank).replace(/^[ \t]*\/\/.*$/gm, blank);
}

/** Every `.ts`/`.tsx` under `src`, tests excluded, relative path to comment-free source. */
function everySource(): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$|\.d\.ts$/.test(entry.name)) {
        out.set(relative(SRC, path), blankComments(readFileSync(path, "utf8")));
      }
    }
  };
  walk(SRC);
  return out;
}

/** One read, and the paths it can mean: one, or one per base an alias name was given in that file. */
export type KeyRead = { file: string; line: number; paths: string[][] };

const CHAIN = String.raw`((?:\??\.[A-Za-z_$][\w$]*)+)`;
/* The names the dictionary goes by when it is read whole: `t`, `dictionary`, `dict`, and a call that returns it. */
const ROOT = String.raw`(?:\b(?:t|dictionary|dict)\b|\bgetDictionary\([^()]*\)|\bgetDictionary\(await getLocale\(\)\))`;

/* A chain whose first segment is a namespace is a dictionary read only off one of these names. */
const DICTIONARY_NAMES = /^(?:t|dictionary|dict)$|^getDictionary\(/;

function segments(chain: string): string[] {
  return chain.split(".").map((s) => s.replace(/\?$/, "")).filter(Boolean);
}

/**
 * EVERY DICTIONARY KEY THE CODE NAMES, STATICALLY (D61, C9).
 *
 * What it reads, in every non-test module under `src`:
 *   - a chain off the whole dictionary: `t.ns.a.b`, `dictionary.ns.a`,
 *     `getDictionary(locale).ns.a`, whose first segment is a namespace;
 *   - a chain off an alias declared in the same file from one of those
 *     (`const sx = t.experienceDetail;` then `sx.listing.kinds`), or from
 *     `useScopedCopy("ns")`. A name declared twice in one file against two
 *     bases passes if either base has the key; a name the file ALSO binds as
 *     a parameter or a destructured prop (`function Head({ copy })`) is
 *     skipped, because which `copy` a line means is a question of scope.
 * What it cannot read: a key built at run time (`copy[key]`, which stops the
 * chain), a dictionary handed through props under another name and read with
 * no namespace in the chain (`copy.title` inside a child component), a
 * dictionary named anything but `t`, `dictionary` or `dict` (`copy.common` is
 * as often a mail module's own words), destructuring, and template-literal
 * keys. Those
 * are typed reads of `Dictionary`, which `tsc` checks; this exists for the
 * casts and `Record<string, ...>` views tsc cannot.
 */
export function dictionaryKeyReads(): KeyRead[] {
  const reads: KeyRead[] = [];
  for (const [file, source] of everySource()) {
    const lineOf = (index: number) => source.slice(0, index).split("\n").length;
    const aliases = new Map<string, string[][]>();
    const alias = (name: string, path: string[]) => aliases.set(name, [...(aliases.get(name) ?? []), path]);
    for (const m of source.matchAll(new RegExp(String.raw`\bconst\s+(\w+)\s*(?::[^=]+)?=\s*${ROOT}${CHAIN}\s*[;\n]`, "g"))) {
      const path = segments(m[2]!);
      if (NAMESPACES.has(path[0]!)) alias(m[1]!, path);
    }
    for (const m of source.matchAll(new RegExp(String.raw`\bconst\s+(\w+)\s*=\s*useScopedCopy\(\s*["'](\w+)["']\s*\)(${CHAIN})?\s*[;\n]`, "g"))) {
      if (NAMESPACES.has(m[2]!)) alias(m[1]!, [m[2]!, ...segments(m[3] ?? "")]);
    }
    for (const name of [...aliases.keys()]) {
      const declared = source.match(new RegExp(String.raw`\b(?:const|let|var)\s+${name}\b`, "g"))?.length ?? 0;
      if (declared > aliases.get(name)!.length) aliases.delete(name);
      else if (new RegExp(String.raw`(?<!=)[({,]\s*${name}\s*[,:})=?]`).test(source)) aliases.delete(name);
    }
    for (const m of source.matchAll(new RegExp(String.raw`(\b[A-Za-z_$][\w$]*\b|${ROOT})${CHAIN}`, "g"))) {
      const head = m[1]!;
      const before = source.slice(Math.max(0, m.index! - 24), m.index!);
      /* Mid-chain, or inside a path string ("@/app/css/catalogue.css"). */
      if (/[./\w$]$/.test(before) || NOT_A_DICTIONARY.test(before + head)) continue;
      const chain = segments(m[2]!);
      if (NAMESPACES.has(chain[0]!) && DICTIONARY_NAMES.test(head)) {
        reads.push({ file, line: lineOf(m.index!), paths: [chain] });
      } else if (aliases.has(head)) {
        reads.push({ file, line: lineOf(m.index!), paths: aliases.get(head)!.map((base) => [...base, ...chain]) });
      }
    }
  }
  return reads;
}

/**
 * Where a read leaves the dictionary: the first segment that names nothing in
 * an object, or null when the read lands (or walks on into a string or an
 * array, whose `.replace` and `.length` are not keys).
 */
export function missingSegment(dictionary: unknown, path: readonly string[]): number | null {
  let node: unknown = dictionary;
  for (let i = 0; i < path.length; i += 1) {
    if (node === null || typeof node !== "object" || Array.isArray(node)) return null;
    const key = path[i]!;
    if (!Object.prototype.hasOwnProperty.call(node, key)) return key in Object.prototype ? null : i;
    node = (node as Record<string, unknown>)[key];
  }
  return null;
}
