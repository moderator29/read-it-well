import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * EVERY BUTTON MODIFIER A COMPONENT WRITES HAS A RULE BEHIND IT.
 *
 * `<Button variant="secondary">` renders `nf-btn--glass`. Markup written by
 * hand wrote `nf-btn--secondary`, a class no stylesheet defines, so those
 * buttons drew no surface and no edge, only the bare button's upper-half
 * sheen: a grey bar with the label hanging under it. The thread's passport
 * switch and the "I feel unsafe" sheet's two actions looked broken in both
 * themes (Track M QA, 25 September 2026).
 *
 * The files still listed are staff desks and the agreement's cancel, left for
 * their owners: each is one class name, `nf-btn--secondary` to
 * `nf-btn--glass`. The list may only shrink.
 */
const SRC = join(process.cwd(), "src");

const NOT_YET: Record<string, string> = {
  "components/app/agreements/AgreementControls.tsx": "the agreement's cancel control",
  "app/admin/_lanes/SafetyHoldButtons.tsx": "staff desk",
  "app/admin/money/GuaranteeDesk.tsx": "staff desk",
  "app/admin/agreements/AgreementQueue.tsx": "staff desk",
  "app/admin/compliance/_lanes/StrControls.tsx": "staff desk",
  "app/admin/_components/ConsiderStr.tsx": "staff desk",
  "app/admin/_components/StaffFrame.tsx": "staff desk",
  "app/admin/kyc/CredentialForm.tsx": "staff desk",
  "app/admin/account-recovery/RecoveryDesk.tsx": "staff desk",
  "app/admin/listings/[id]/PhotoBackfillButton.tsx": "staff desk",
  "app/admin/stops/RecallPanel.tsx": "staff desk",
};

function walk(dir: string, pattern: RegExp, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name !== "(dev)" && name !== "node_modules") walk(path, pattern, out);
    } else if (pattern.test(name) && !/\.test\.tsx?$/.test(name)) {
      out.push(path);
    }
  }
  return out;
}

describe("button modifiers", () => {
  const defined = new Set(
    walk(SRC, /\.css$/).flatMap((file) => [...readFileSync(file, "utf8").matchAll(/\.(nf-btn--[a-z0-9-]+)/g)].map((m) => m[1])),
  );
  const uses = walk(SRC, /\.tsx?$/).flatMap((file) =>
    [...readFileSync(file, "utf8").matchAll(/\bnf-btn--[a-z0-9-]+/g)].map((m) => ({ file: relative(SRC, file), name: m[0] })),
  );

  it("the stylesheets were read", () => {
    expect(defined.has("nf-btn--glass")).toBe(true);
    expect(defined.has("nf-btn--primary")).toBe(true);
  });

  it("names only classes a stylesheet defines", () => {
    const undefinedUses = uses.filter((use) => !defined.has(use.name) && !(use.file in NOT_YET));
    expect(undefinedUses).toEqual([]);
  });

  it("keeps its list of files still to change honest", () => {
    for (const file of Object.keys(NOT_YET)) {
      const still = uses.some((use) => use.file === file && !defined.has(use.name));
      expect(still, `${file} no longer needs to be listed`).toBe(true);
    }
  });
});
