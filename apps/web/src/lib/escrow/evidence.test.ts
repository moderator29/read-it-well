import { describe, expect, it } from "vitest";

import {
  ESCROW_FACTS,
  ESCROW_FACT_VALUES,
  EVIDENCE_BUCKET,
  EVIDENCE_CAPTION_MAX,
  EVIDENCE_MAX_BYTES,
  EVIDENCE_MIME_TYPES,
  PROPOSAL_EXPLAINER,
  PROPOSAL_OPENER,
  bannedWordsIn,
  evidenceObjectPath,
  factNeeds,
  factSentence,
  isEvidenceMimeType,
  nairaToKobo,
  payoutDateIfFundedNow,
  proposalStanding,
} from "./copy";

/**
 * THE EVIDENCE VOCABULARY AND THE PROPOSAL'S WORDS.
 *
 * WHAT THESE TESTS ARE FOR. Every closed list here has a twin in the database:
 * the thirteen facts are an enum, the shape rules are a check constraint, the
 * five mime types and the ten megabytes are the bucket's own settings, and the
 * two hundred characters are a check constraint as well. TypeScript cannot see
 * any of them. These tests pin the copy layer to the values READ BACK OFF THE
 * LIVE DATABASE on 23 September, so a change on one side fails here rather
 * than becoming a refusal a person cannot act on.
 *
 * The database halves are proved separately and against the real thing:
 * `scripts/probes/escrow_evidence_two_files.sql` and
 * `scripts/probes/escrow_evidence_path.sql`.
 */

/** Read back from `pg_enum` for `escrow_fact` on 23 September 2026, in order. */
const FACTS_IN_THE_DATABASE = [
  "viewing_attended",
  "viewing_missed",
  "keys_received",
  "keys_not_received",
  "agreement_signed",
  "agreement_not_signed",
  "service_delivered",
  "service_not_delivered",
  "property_matched_listing",
  "property_differed_from_listing",
  "contacted_on",
  "no_reply_since",
  "amount_agreed",
];

/** Read back from `storage.buckets` for `escrow-evidence` on the same day. */
const BUCKET_IN_THE_DATABASE = {
  id: "escrow-evidence",
  public: false,
  file_size_limit: 10_485_760,
  allowed_mime_types: ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"],
};

describe("the thirteen facts", () => {
  it("is exactly the enum the database carries, in the same order", () => {
    expect(ESCROW_FACT_VALUES).toEqual(FACTS_IN_THE_DATABASE);
    expect(ESCROW_FACTS).toHaveLength(13);
  });

  it("gives every one of them a sentence a person would actually say", () => {
    for (const fact of ESCROW_FACTS) {
      expect(fact.line.length).toBeGreaterThan(3);
      /* Not the enum value with the underscores taken out. */
      expect(fact.line).not.toContain("_");
    }
  });

  it("asks for a date on exactly the four the check constraint asks for", () => {
    const dated = ESCROW_FACTS.filter((f) => f.needs === "date").map((f) => f.value);
    /* `escrow_evidence_fact_carries_what_it_needs`, first branch. */
    expect(dated).toEqual([
      "viewing_attended",
      "viewing_missed",
      "contacted_on",
      "no_reply_since",
    ]);
  });

  it("asks for an amount on exactly one, and it is the one the constraint names", () => {
    const withAmount = ESCROW_FACTS.filter((f) => f.needs === "amount").map((f) => f.value);
    expect(withAmount).toEqual(["amount_agreed"]);
  });

  it("asks for nothing beside the other eight, which is what the constraint allows", () => {
    expect(ESCROW_FACTS.filter((f) => f.needs === "nothing")).toHaveLength(8);
  });

  it("folds the date or the amount into the sentence, and neither into the wrong one", () => {
    expect(factSentence({ fact: "viewing_attended", happenedOn: "2026-10-03" })).toContain(
      "The viewing happened on",
    );
    expect(factSentence({ fact: "amount_agreed", amountMinor: 25_000_00 })).toContain(
      "The amount agreed",
    );
    expect(factSentence({ fact: "keys_received" })).toBe("The keys were handed over");
  });

  it("renders a value it has never heard of rather than throwing on it", () => {
    /*
     * A row already in the database must render on a dispute even if this
     * deployment predates its value. The test that keeps the list honest is
     * the enum comparison above, not a throw here.
     */
    expect(factSentence({ fact: "something_added_later" })).toBe("A fact");
    expect(factNeeds("something_added_later")).toBe("nothing");
  });

  it("says nothing a lawyer would strike out", () => {
    for (const fact of ESCROW_FACTS) {
      expect(bannedWordsIn(fact.line)).toEqual([]);
    }
  });
});

describe("what may be attached", () => {
  it("offers exactly the types the bucket accepts, and no sixth", () => {
    expect([...EVIDENCE_MIME_TYPES]).toEqual(BUCKET_IN_THE_DATABASE.allowed_mime_types);
  });

  it("caps at the bucket's own ceiling rather than a rounder number", () => {
    expect(EVIDENCE_MAX_BYTES).toBe(BUCKET_IN_THE_DATABASE.file_size_limit);
  });

  it("names the bucket the database actually has", () => {
    expect(EVIDENCE_BUCKET).toBe(BUCKET_IN_THE_DATABASE.id);
  });

  it("refuses a type the bucket would refuse, before the upload is attempted", () => {
    expect(isEvidenceMimeType("image/jpeg")).toBe(true);
    /* HEIF is deliberately absent: the bucket does not carry it. */
    expect(isEvidenceMimeType("image/heif")).toBe(false);
    expect(isEvidenceMimeType("video/mp4")).toBe(false);
    expect(isEvidenceMimeType("")).toBe(false);
  });

  it("caps the caption where the check constraint caps it", () => {
    expect(EVIDENCE_CAPTION_MAX).toBe(200);
  });
});

describe("where a file goes in the bucket", () => {
  const escrowId = "11111111-1111-4111-8111-111111111111";
  const authorId = "22222222-2222-4222-8222-222222222222";
  const unique = "33333333-3333-4333-8333-333333333333";

  it("puts the agreement first and the person filing second, which is the permission", () => {
    const path = evidenceObjectPath({ escrowId, authorId, fileName: "receipt.JPG", unique });
    expect(path).toBe(`${escrowId}/${authorId}/${unique}.jpg`);
  });

  it("survives a name with no extension at all", () => {
    expect(evidenceObjectPath({ escrowId, authorId, fileName: "scan", unique })).toBe(
      `${escrowId}/${authorId}/${unique}`,
    );
  });

  it("cannot be walked out of its own folder by a crafted file name", () => {
    /*
     * The name reaches the path only as an extension, and only as letters and
     * digits. A traversal attempt therefore cannot produce a second slash, and
     * the storage policy would refuse it even if it did.
     */
    const path = evidenceObjectPath({
      escrowId,
      authorId,
      fileName: "a.../../../other-escrow/x.jpg",
      unique,
    });
    expect(path.split("/")).toHaveLength(3);
    expect(path.startsWith(`${escrowId}/${authorId}/`)).toBe(true);
  });

  it("keeps a dotfile from becoming an extension", () => {
    expect(evidenceObjectPath({ escrowId, authorId, fileName: ".env", unique })).toBe(
      `${escrowId}/${authorId}/${unique}`,
    );
  });
});

describe("naira in the box, integer kobo on the wire", () => {
  it("multiplies without ever touching a float", () => {
    expect(nairaToKobo("250000")).toBe(25_000_000);
    expect(nairaToKobo("1234.56")).toBe(123_456);
    /* `Number("1234.56") * 100` is 123455.99999999999. This is why. */
    expect(Number.isInteger(nairaToKobo("1234.56"))).toBe(true);
  });

  it("forgives the way people actually write money", () => {
    expect(nairaToKobo("250,000")).toBe(25_000_000);
    expect(nairaToKobo(" 250 000 ")).toBe(25_000_000);
  });

  it("pads a single decimal place rather than reading it as kobo", () => {
    expect(nairaToKobo("10.5")).toBe(1_050);
    expect(nairaToKobo("10.05")).toBe(1_005);
  });

  it("refuses rather than guessing", () => {
    for (const bad of ["", ".", "-5", "1e3", "1.005", "abc", "₦500", "5.", "0", "0.00"]) {
      expect(nairaToKobo(bad)).toBeNull();
    }
  });
});

describe("the proposal's words", () => {
  it("says a date and never a number of days", () => {
    const line = payoutDateIfFundedNow(21, new Date("2026-09-23T10:00:00Z"));
    expect(line).toContain("14 Oct 2026");
    expect(line).not.toMatch(/\b21 days\b/);
    expect(line).not.toMatch(/\bdays\b/);
  });

  it("clamps the window the same way the database clamps it", () => {
    const floor = payoutDateIfFundedNow(0, new Date("2026-09-23T10:00:00Z"));
    const ceiling = payoutDateIfFundedNow(9999, new Date("2026-09-23T10:00:00Z"));
    expect(floor).toContain("24 Sept 2026");
    /* 180 days from 23 September 2026. */
    expect(ceiling).toContain("22 Mar 2027");
  });

  it("carries no banned word anywhere a person reads it", () => {
    for (const line of [
      PROPOSAL_OPENER,
      PROPOSAL_EXPLAINER,
      proposalStanding("payer"),
      proposalStanding("payee"),
      payoutDateIfFundedNow(),
    ]) {
      expect(bannedWordsIn(line)).toEqual([]);
    }
  });

  it("says nothing has moved, to both sides, before it says anything else", () => {
    expect(PROPOSAL_EXPLAINER).toContain("Nothing is paid now");
    expect(proposalStanding("payer")).toContain("Nothing has left your balance");
    expect(proposalStanding("payee")).toContain("Nothing has moved");
  });

  it("does not imply the other person has agreed to anything", () => {
    for (const line of [PROPOSAL_OPENER, PROPOSAL_EXPLAINER, proposalStanding("payer")]) {
      expect(line.toLowerCase()).not.toContain("accepted");
      expect(line.toLowerCase()).not.toContain("agreed to");
      /* "requested" carries an obligation that "proposed" does not. */
      expect(line.toLowerCase()).not.toContain("requested");
    }
  });

  it("carries no em dash, on either surface", () => {
    for (const line of [
      PROPOSAL_OPENER,
      PROPOSAL_EXPLAINER,
      proposalStanding("payer"),
      proposalStanding("payee"),
    ]) {
      expect(line).not.toContain("—");
    }
  });
});
