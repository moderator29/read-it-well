import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LOCALES, getDictionary } from "@vallo/i18n";
import { servableType } from "@/lib/admin/documents";
import {
  ACCEPTED_MIME,
  MAX_FILE_BYTES,
  MAX_FILE_LABEL,
  documentExtension,
  rejectFileIssue,
} from "@/components/verification/kyc";

/**
 * EVERY UPLOADER INTO THE PRIVATE DOCUMENT BUCKET APPLIES THE BUCKET'S OWN RULE.
 *
 * `agent-documents` refuses anything over 8MB and anything outside six types
 * (20260809051809). The verification uploader said 8MB; the agent
 * registration card, the reply to a reviewer and the professional wizard all
 * said 10MB, so a 9MB photo passed the screen, was refused by storage, and the
 * slot said "try again" about a file that could never go through. These hold
 * the three uploaders, the copy and the migration to one number.
 */

const SRC = join(process.cwd(), "src");
const read = (path: string) => readFileSync(join(SRC, path), "utf8");
const migration = readFileSync(
  join(process.cwd(), "../../supabase/migrations/20260809051809_a_bucket_that_accepts_anything_of_any_size.sql"),
  "utf8",
);

const UPLOADERS = [
  "components/supply/UploadCard.tsx",
  "components/agent/ApplyWizard.tsx",
  "components/verification/DocumentUploader.tsx",
] as const;

describe("the document bucket's limits, stated once", () => {
  it("matches the ceiling and the types the migration gives the bucket", () => {
    const block = /update storage\.buckets\s+set file_size_limit = (\d+),\s+allowed_mime_types = array\[([^\]]+)\]\s+where id = 'agent-documents'/.exec(
      migration,
    );
    expect(block).not.toBeNull();
    expect(Number(block?.[1])).toBe(MAX_FILE_BYTES);
    const types = (block?.[2] ?? "").split(",").map((t) => t.trim().replace(/'/g, ""));
    expect([...types].sort()).toEqual([...ACCEPTED_MIME].sort());
    expect(MAX_FILE_LABEL).toBe("8MB");
  });

  it.each(UPLOADERS)("%s checks a file through rejectFileIssue and sets no ceiling of its own", (path) => {
    const source = read(path);
    expect(source).toContain("rejectFileIssue(");
    expect(source).not.toMatch(/\d+\s*\*\s*1024\s*\*\s*1024/);
  });

  it.each(UPLOADERS)("%s clears its file input so the same file can be chosen again", (path) => {
    expect(read(path)).toMatch(/\.value = ""/);
  });

  it("refuses one byte over the ceiling and a type the bucket refuses", () => {
    expect(rejectFileIssue({ type: "image/jpeg", size: MAX_FILE_BYTES })).toBeNull();
    expect(rejectFileIssue({ type: "image/jpeg", size: MAX_FILE_BYTES + 1 })).toBe("size");
    expect(rejectFileIssue({ type: "image/gif", size: 1000 })).toBe("type");
    expect(rejectFileIssue({ type: "", size: 1000 })).toBe("type");
  });
});

describe("the stored extension", () => {
  it("is one the reviewer's viewer serves as the same type", () => {
    for (const type of ACCEPTED_MIME) {
      expect(servableType(`u/b/identity-1.${documentExtension(type)}`)).toBe(type === "image/jpeg" ? "image/jpeg" : type);
    }
  });
});

describe("the words about the limit", () => {
  it("name the bucket's ceiling in every locale and never the old one", () => {
    for (const locale of LOCALES) {
      const t = getDictionary(locale);
      for (const line of [t.supply.register.fileTooBig, t.agent.apply.documents.chooseFile]) {
        expect(line, `${locale}: ${line}`).toContain("8MB");
        expect(line, `${locale}: ${line}`).not.toContain("10MB");
      }
    }
    const en = getDictionary("en");
    expect(en.supply.register.fileLimit).toContain("{size}");
    expect(en.supply.register.photoLimit).toContain("{size}");
    expect(en.agent.status.respond.attachBody).not.toMatch(/10 ?MB/);
  });
});
