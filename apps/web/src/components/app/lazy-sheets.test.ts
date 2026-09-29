import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { STAYS_PARAM_KEYS } from "@/lib/stays/query";
import { staysParamsSchema } from "@/lib/stays/filters";

/**
 * WHAT A PAGE LOADS BEFORE ANYBODY OPENS A SHEET (lib/ui/lazy-sheet.ts).
 *
 * zod is about 62 KB gzipped, and it reached the first load of /search,
 * /stays/search and every page with a "Report this" link through three sheets
 * nobody had opened and one constant. This walks each eager module's STATIC
 * import graph, the modules the browser needs before the page can run (a
 * dynamic `import()` is a separate chunk and is not followed; a "use server"
 * module is a reference and is not followed; a type-only import is erased),
 * and fails if zod, or the sheet's own body, is in it.
 */
const SRC = join(__dirname, "..", "..");

function resolve(spec: string, from: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = normalize(join(dirname(from), spec));
  else return null;
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    if (existsSync(base + ext) && /\.tsx?$/.test(base + ext)) return base + ext;
  }
  return null;
}

/** Every local module and bare package the file statically pulls in. */
function staticGraph(root: string): { files: Set<string>; packages: Set<string> } {
  const files = new Set<string>();
  const packages = new Set<string>();
  const queue = [join(SRC, root)];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (files.has(file)) continue;
    const source = readFileSync(file, "utf8");
    if (file !== join(SRC, root) && /^\s*["']use server["']/.test(source)) continue;
    files.add(file);
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const m of code.matchAll(/(?:^|\n)\s*(?:import|export)\s+(type\s)?[^;]*?from\s+["']([^"']+)["']/g)) {
      if (m[1]) continue;
      const spec = m[2]!;
      const next = resolve(spec, file);
      if (next) queue.push(next);
      else if (!spec.startsWith(".") && !spec.startsWith("@/")) packages.add(spec);
    }
  }
  return { files, packages };
}

const rel = (files: Set<string>) => [...files].map((f) => relative(SRC, f).split("\\").join("/"));

const EAGER: { root: string; body?: string }[] = [
  { root: "components/app/filters/FilterDrawer.tsx", body: "components/app/filters/FilterDrawerPanel.tsx" },
  { root: "components/app/stays/StayFilterSheet.tsx", body: "components/app/stays/StayFilterSheetPanel.tsx" },
  { root: "components/app/ReportSheet.tsx", body: "components/app/ReportSheetPanel.tsx" },
  { root: "components/app/search/shelf-query.ts" },
  { root: "app/(app)/listing/[id]/ReserveTable.tsx" },
];

describe("the sheets load their body when they are wanted", () => {
  for (const { root, body } of EAGER) {
    it(`${root} ships no zod${body ? " and not its sheet's body" : ""}`, () => {
      const { files, packages } = staticGraph(root);
      expect([...packages].filter((p) => p === "zod" || p.startsWith("zod/"))).toEqual([]);
      if (body) expect(rel(files)).not.toContain(body);
    });
  }

  it("each trigger fetches its body through next/dynamic, client only, and prefetches the same module", () => {
    for (const { root, body } of EAGER) {
      if (!body) continue;
      const code = readFileSync(join(SRC, root), "utf8");
      const spec = `./${body.split("/").pop()!.replace(/\.tsx$/, "")}`;
      expect(code).toContain('from "next/dynamic"');
      expect(code).toContain("ssr: false");
      /* One for `dynamic`, one for the hover and focus prefetch. */
      expect(code.split(`import("${spec}")`).length - 1).toBe(2);
      expect(code).toContain("sheet.warmProps");
    }
  });

  it("the body still reaches the validator's vocabulary, so nothing was dropped", () => {
    expect(rel(staticGraph("components/app/ReportSheetPanel.tsx").files)).toContain("lib/reports/categories.ts");
  });
});

describe("the stays parameter names without the validator", () => {
  it("are exactly the schema's keys, in its order", () => {
    expect([...STAYS_PARAM_KEYS]).toEqual(Object.keys(staysParamsSchema.shape));
  });
});
