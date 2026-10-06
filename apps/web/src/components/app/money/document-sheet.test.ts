import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DOC_PRINT_ATTR, documentRowClass, documentSheetClass, documentStateClass } from "./document-sheet";
import { AGREEMENT_STATUS_LABEL, agreementStatusTone } from "@/components/app/agreements/status";

/**
 * THE DOCUMENT SHEET (D28.1) AND THE RULES IT MUST NOT DRIFT FROM.
 *
 * Paper is a treatment for the document, never for the screen: these checks
 * pin that the sheet is a class on an element rather than a theme switch,
 * that it reads only tokens (each with a fallback, so it renders before or
 * after the document tokens land), that its motion is transform and opacity
 * with a 160ms fade for reduced motion, that no money on it animates, and
 * that print prints the sheet and nothing else.
 */
const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");

const docCss = stripComments(read("app/css/document.css"));
const printCss = stripComments(read("app/css/print.css"));
const component = read("components/app/money/DocumentSheet.tsx");

describe("documentSheetClass", () => {
  it("is a plain document by default", () => {
    expect(documentSheetClass()).toBe("nf-doc");
  });
  it("adds the receipt's torn edge only for a receipt", () => {
    expect(documentSheetClass("receipt", "mt-md")).toBe("nf-doc nf-doc--receipt mt-md");
  });
  it("names rows and states", () => {
    expect(documentRowClass()).toBe("nf-doc__row");
    expect(documentRowClass("total")).toBe("nf-doc__row nf-doc__row--total");
    expect(documentStateClass(true)).toContain("nf-doc__state--done");
    expect(documentStateClass(false)).toContain("nf-doc__state--waiting");
  });
});

describe("document.css", () => {
  it("never flips the theme: no data-theme is written, only read", () => {
    expect(component).not.toMatch(/data-theme=/);
    expect(docCss).not.toMatch(/--nf-doc-[a-z-]+\s*:/);
  });

  it("reads every document token with a fallback", () => {
    const uses = [...docCss.matchAll(/var\(--nf-doc-[a-z-]+(.)/g)];
    expect(uses.length).toBeGreaterThan(0);
    for (const use of uses) expect(use[1], use[0]).toBe(",");
  });

  it("unrolls with transform and opacity only", () => {
    const keyframes = [...docCss.matchAll(/@keyframes\s+[\w-]+\s*\{([\s\S]*?\})\s*\}/g)].map((m) => m[1] ?? "");
    expect(keyframes.length).toBe(2);
    for (const body of keyframes) {
      const props = [...body.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]);
      for (const prop of props) expect(["opacity", "transform"]).toContain(prop);
    }
  });

  it("collapses to a 160ms fade under reduced motion and Calm", () => {
    const reduce = docCss.slice(docCss.indexOf("prefers-reduced-motion: reduce"));
    expect(reduce).toMatch(/nf-doc-fade 160ms/);
    expect(docCss).toMatch(/\[data-motion="calm"\] \.nf-doc \{\s*animation: nf-doc-fade 160ms/);
  });

  it("animates the sheet, never a figure, row or amount on it", () => {
    const animated = [...docCss.matchAll(/([^{}]+)\{[^{}]*animation:/g)].map((m) => (m[1] ?? "").trim());
    for (const selector of animated) expect(selector).not.toMatch(/__figure|__row|__ref/);
  });
});

describe("print.css", () => {
  it("prints only on a page that carries a printable sheet", () => {
    expect(printCss).toMatch(/@media print/);
    expect(printCss).toContain(`body:has([${DOC_PRINT_ATTR}])`);
    expect(printCss).toMatch(/display:\s*none\s*!important/);
  });

  it("prints ink on no background", () => {
    expect(printCss).toMatch(/background:\s*none\s*!important/);
    expect(printCss).toContain("color: var(--nf-content-on-paper) !important");
  });
});

describe("DocumentSheet", () => {
  it("loads its own stylesheets, out of the global bundle (C12)", () => {
    expect(component).toContain('import "@/app/css/document.css";');
    expect(component).toContain('import "@/app/css/print.css";');
    const globals = read("app/globals.css");
    expect(globals).not.toContain("./css/document.css");
    expect(globals).not.toContain("./css/print.css");
  });
});

describe("agreement status tones", () => {
  it("gives every known status a tone, so none is colour alone", () => {
    for (const status of Object.keys(AGREEMENT_STATUS_LABEL)) {
      expect(agreementStatusTone(status), status).not.toBe(undefined);
    }
    expect(agreementStatusTone("paid")).toBe("success");
    expect(agreementStatusTone("rejected")).toBe("danger");
    expect(agreementStatusTone("something-new")).toBe("neutral");
  });
});
