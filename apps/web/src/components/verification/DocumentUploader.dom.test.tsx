/**
 * DOC-20: the ID-document upload on /verification had no accessible name
 * (axe `label`, critical) and its heading skipped a level (`heading-order`).
 * Rendered for real and checked by axe-core in Chromium.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it } from "vitest";
import { axe, closeAxe, hasBrowser } from "@/lib/a11y/axe";
import { DocumentUploader } from "./DocumentUploader";

afterAll(closeAxe);

describe.skipIf(!hasBrowser && !process.env.CI)("DocumentUploader (axe)", () => {
  const page = (body: string) => `<h1>Verify your identity</h1>${body}`;

  it("names the file input by its document title, with no axe violations", async () => {
    const html = renderToStaticMarkup(<DocumentUploader kind="identity" file={null} onChange={() => undefined} />);
    expect(await axe(page(html))).toEqual([]);
    expect(html).toMatch(/type="file"[^>]*aria-labelledby="[^"]+-title"/);
  });

  it("stays clean with a file chosen", async () => {
    const html = renderToStaticMarkup(
      <DocumentUploader kind="address" file={{ name: "bill.pdf", size: 120_000, type: "application/pdf" }} onChange={() => undefined} />,
    );
    expect(await axe(page(html))).toEqual([]);
  });
});
