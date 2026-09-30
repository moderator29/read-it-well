import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { REVIEW_STATUS, draftNamespaces, getDictionary, reviewStateOf } from "@vallo/i18n";
import { haDrafts } from "../../../../../packages/i18n/src/locales/drafts/ha";
import { yoDrafts } from "../../../../../packages/i18n/src/locales/drafts/yo";
import { igDrafts } from "../../../../../packages/i18n/src/locales/drafts/ig";
import { coverageTotals, namespaceCoverage } from "./locale-completeness";

/**
 * MACHINE DRAFTS ARE RECORDED AS DRAFTS, AND NOTHING IS CALLED REVIEWED
 * WITHOUT A NAME (C11, 30 September 2026).
 *
 * `packages/i18n/src/review-status.ts` is the registry; the draft modules live
 * in `packages/i18n/src/locales/drafts/<locale>/`. This keeps the two equal,
 * so a namespace cannot reach a Hausa, Yoruba or Igbo screen from a draft
 * module without the registry saying it is a draft, and prints the coverage
 * report (missing, draft, unreviewed, reviewed per namespace) into the test
 * output on every run.
 */

const DRAFTS = { ha: haDrafts, yo: yoDrafts, ig: igDrafts } as const;
const DRAFT_DIR = join(__dirname, "..", "..", "..", "..", "..", "packages", "i18n", "src", "locales", "drafts");

describe("translation review status", () => {
  for (const locale of ["ha", "yo", "ig"] as const) {
    it(`${locale}: every draft module is registered, and every registered draft exists`, () => {
      const modules = Object.keys(DRAFTS[locale]).sort();
      const registered = Object.keys(REVIEW_STATUS[locale]).sort();
      expect(modules, "A namespace in drafts/<locale>/index.ts is not in review-status.ts, or the reverse.").toEqual(
        registered,
      );
    });

    it(`${locale}: a registered draft namespace is a real English namespace and nearly whole`, () => {
      const english = getDictionary("en") as unknown as Record<string, unknown>;
      const rows = new Map(namespaceCoverage(locale).map((row) => [row.namespace, row]));
      for (const namespace of draftNamespaces(locale)) {
        expect(namespace in english, `${namespace} is not an English namespace`).toBe(true);
        const row = rows.get(namespace)!;
        /* A draft leaves out only what is the same in every language (the
           wordmark, a brand or store name, an example person's name, a
           clock time), so the English-valued ratchet in
           locale-completeness.test.ts does not count them as untranslated.
           landingRooms is the heaviest at 10 of 101; past 15% is an
           unfinished draft. */
        expect(row.missing / row.total, `${locale}.${namespace}: ${row.missing} of ${row.total} keys missing`).toBeLessThan(
          0.15,
        );
        expect(reviewStateOf(locale, `${namespace}.x`)).toBe("machine-draft");
      }
    });
  }

  it("a namespace marked reviewed names its reviewer and the date", () => {
    for (const entries of Object.values(REVIEW_STATUS)) {
      for (const entry of Object.values(entries)) {
        if (entry.state === "native-reviewed") {
          expect(entry.reviewer.trim().length).toBeGreaterThan(0);
          expect(entry.reviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        } else {
          expect(entry.drafted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
      }
    }
  });

  it("every draft module says, in the file, that it is a machine draft", () => {
    for (const locale of ["ha", "yo", "ig"]) {
      for (const name of readdirSync(join(DRAFT_DIR, locale))) {
        if (name === "index.ts") continue;
        const text = readFileSync(join(DRAFT_DIR, locale, name), "utf8");
        expect(text, `${locale}/${name} does not carry the MACHINE DRAFT marker`).toMatch(/MACHINE DRAFT/);
      }
    }
  });

  it("prints the coverage report", () => {
    const lines = ["locale  total  missing  staff  draft  unreviewed  reviewed"];
    for (const locale of ["ha", "yo", "ig"] as const) {
      const t = coverageTotals(locale);
      lines.push(`${locale.padEnd(6)}  ${t.total}   ${t.missing}     ${t.staff}    ${t.draft}   ${t.unreviewed}        ${t.reviewed}`);
      expect(t.missing + t.staff + t.draft + t.unreviewed + t.reviewed).toBe(t.total);
    }
    // eslint-disable-next-line no-console -- the coverage report is this test's printed output
    console.info(lines.join("\n"));
  });
});
