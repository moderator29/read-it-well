import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { EVERY_MESSAGE } from "./fixtures";

/**
 * Writes every catalogue message to disk as HTML and plain text so a person
 * (or Playwright) can look at the real thing. INERT unless EMAIL_PREVIEW_DIR
 * is set, so the normal suite never writes a file. Point it outside the
 * repository:
 *
 *   EMAIL_PREVIEW_DIR=/tmp/email-preview npx vitest run src/lib/email/preview-render.test.ts
 */
const DIR = process.env.EMAIL_PREVIEW_DIR;

describe.skipIf(!DIR)("email preview render", () => {
  it("writes one .html and one .txt per message", () => {
    mkdirSync(DIR!, { recursive: true });
    const index: string[] = [];
    for (const { name, message } of EVERY_MESSAGE) {
      const file = name.replace(/[^a-zA-Z0-9]+/g, "-");
      writeFileSync(join(DIR!, `${file}.html`), message.html);
      writeFileSync(join(DIR!, `${file}.txt`), `Subject: ${message.subject}\n\n${message.text}`);
      index.push(file);
    }
    writeFileSync(join(DIR!, "index.json"), JSON.stringify(index, null, 2));
    expect(index.length).toBeGreaterThan(40);
  });
});
