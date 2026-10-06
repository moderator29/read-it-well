/**
 * An Android resource comment may not contain "--": aapt refuses the whole
 * resource set and the debug build fails (a CSS token name such as
 * `--nf-surface-artwork` in a comment did exactly that, 6 October). Name a
 * token in an Android comment without its leading dashes.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const RES = join(__dirname, "..", "..", "..", "android", "app", "src", "main", "res");

function xmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return xmlFiles(path);
    return name.endsWith(".xml") ? [path] : [];
  });
}

describe("Android resource comments", () => {
  it("never carry a double hyphen", () => {
    const offenders = xmlFiles(RES).flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(/<!--([\s\S]*?)-->/g)]
        .filter((m) => m[1].includes("--"))
        .map(() => file.slice(RES.length + 1)),
    );
    expect(offenders).toEqual([]);
  });
});
