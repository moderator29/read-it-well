/**
 * An Android XML comment may not contain "--", and may not end in "-" (so
 * `--->` is as illegal as `-- `): aapt refuses the whole resource set and the
 * debug build fails (a CSS token name such as `--nf-surface-artwork` in a
 * comment did exactly that, 6 October). Name a token in an Android comment
 * without its leading dashes.
 *
 * Every committed .xml under `android/` is read, not only `res/`: the manifest
 * and any other resource directory are compiled by the same tool. Build output
 * and dependencies are not committed source and are skipped.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ANDROID = join(__dirname, "..", "..", "..", "android");
const SKIP = new Set(["build", "node_modules", ".gradle", ".idea", ".cxx", "intermediates"]);

function xmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return xmlFiles(path);
    return name.endsWith(".xml") ? [path] : [];
  });
}

/** The comments in `xml` that aapt would refuse, each as the text it holds. */
export function illegalComments(xml: string): string[] {
  return [...xml.matchAll(/<!--([\s\S]*?)-->/g)]
    .map((m) => m[1] ?? "")
    .filter((body) => body.includes("--") || body.endsWith("-"));
}

describe("the detector", () => {
  it("flags a double hyphen, and a hyphen right before the closing marker", () => {
    expect(illegalComments("<!-- uses --nf-surface-artwork -->")).toHaveLength(1);
    expect(illegalComments("<!-- ends in a hyphen --->")).toHaveLength(1);
    expect(illegalComments("<!-- -->\n<!-- fine - really -->\n<!--  a-b  -->")).toEqual([]);
  });
});

describe("Android XML comments", () => {
  it("are found in the committed tree", () => {
    expect(xmlFiles(ANDROID).length).toBeGreaterThan(0);
  });

  it("never carry a double hyphen or end in a hyphen, in any committed xml under android/", () => {
    const offenders = xmlFiles(ANDROID)
      .filter((file) => illegalComments(readFileSync(file, "utf8")).length > 0)
      .map((file) => relative(ANDROID, file));
    expect(offenders).toEqual([]);
  });
});
