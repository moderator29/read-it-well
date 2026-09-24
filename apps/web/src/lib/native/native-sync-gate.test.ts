import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * DOC-13 / STORE-03. The deep-link check was red and in no gate, so the
 * placeholders in the association files passed silently. Now the native sync
 * refuses while they remain, and CI annotates every run with them.
 */
const root = fileURLToPath(new URL("../../../../../", import.meta.url));
const pkg = JSON.parse(readFileSync(`${root}apps/web/package.json`, "utf8")) as { scripts: Record<string, string> };
const ci = readFileSync(`${root}.github/workflows/ci.yml`, "utf8");

describe("a native binary cannot be synced while the deep links cannot verify", () => {
  it("cap:sync writes the shell origin and runs the strict check before the sync", () => {
    const script = pkg.scripts["cap:sync"] ?? "";
    const shell = script.indexOf("write-shell-config.mjs");
    const check = script.indexOf("check-deep-links.mjs");
    const sync = script.indexOf("npx cap sync");
    expect(shell).toBeGreaterThan(-1);
    expect(check).toBeGreaterThan(shell);
    expect(sync).toBeGreaterThan(check);
    expect(script).not.toContain("--warn");
  });

  it("CI runs the check on every push", () => {
    expect(ci).toContain("npm run check:deep-links --workspace @vallo/web");
  });
});
