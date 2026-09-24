import { describe, expect, it } from "vitest";
import { DOCUMENT_KINDS, STORED_DOCUMENT_KIND } from "./application-document-kinds";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * SUP-11. The live CHECK `agent_documents_kind_known` names the kinds a row
 * may carry. Every wizard slot must land on one of them, and the insert must
 * carry the uploader that `agent_documents_insert_own` compares with auth.uid().
 */
const KNOWN = ["identity", "address", "business", "selfie", "association", "ownership", "mandate"];

describe("professional application documents (SUP-11)", () => {
  it("maps every wizard slot onto a kind the database accepts", () => {
    for (const slot of DOCUMENT_KINDS) {
      expect(KNOWN).toContain(STORED_DOCUMENT_KIND[slot]);
    }
  });

  it("writes the stored kind and the uploader, never the slot name", () => {
    const source = readFileSync(join(__dirname, "application.ts"), "utf8");
    const insert = source.slice(source.indexOf('from("agent_documents").insert('));
    const rows = insert.slice(0, insert.indexOf("storage_path"));
    expect(rows).toContain("uploader_id: user.id");
    expect(rows).toContain("kind: STORED_DOCUMENT_KIND[d.kind]");
  });
});
