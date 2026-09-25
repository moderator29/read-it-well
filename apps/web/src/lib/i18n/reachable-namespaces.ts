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

export function reachableNamespaces(root: string): Set<string> {
  const seen = new Set<string>();
  const used = new Set<string>();
  const queue = [join(SRC, root)];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const source = readFileSync(file, "utf8");
    for (const m of source.matchAll(/\.([a-zA-Z][a-zA-Z0-9]*)\b|\[\s*["']([a-zA-Z][a-zA-Z0-9]*)["']\s*\]/g)) {
      const name = m[1] ?? m[2]!;
      if (NAMESPACES.has(name)) used.add(name);
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

