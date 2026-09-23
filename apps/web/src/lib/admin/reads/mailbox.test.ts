import { describe, expect, it } from "vitest";

import { mailboxLinks, sharedMailboxes, type IdentityRow } from "./mailbox";

/*
 * The counting, without a database.
 *
 * The one mistake worth a test here is counting siblings inside the filtered
 * set instead of inside the whole table, which draws "this person has one
 * account" beside somebody who has five. Two of the assertions below exist
 * only to catch that.
 */

const rows: IdentityRow[] = [
  { user_id: "a", email_canonical: "one@gmail.com", canonical_rule: "gmail" },
  { user_id: "b", email_canonical: "one@gmail.com", canonical_rule: "gmail" },
  { user_id: "c", email_canonical: "one@gmail.com", canonical_rule: "gmail" },
  { user_id: "d", email_canonical: "two@gmail.com", canonical_rule: "gmail" },
  { user_id: "e", email_canonical: "sales+leads@vallospaces.com", canonical_rule: "lowercase_only" },
];

describe("mailboxLinks", () => {
  it("counts the whole mailbox even when one account was asked about", () => {
    const link = mailboxLinks(rows, ["a"]).get("a");
    expect(link?.accountsSharing).toBe(3);
    expect(link?.siblingUserIds).toEqual(["b", "c"]);
  });

  it("never counts the account itself as its own sibling", () => {
    for (const id of ["a", "b", "c"]) {
      expect(mailboxLinks(rows, [id]).get(id)?.siblingUserIds).not.toContain(id);
    }
  });

  it("reports a lone account as one, which is the no-link answer", () => {
    const link = mailboxLinks(rows, ["d"]).get("d");
    expect(link?.accountsSharing).toBe(1);
    expect(link?.siblingUserIds).toEqual([]);
  });

  it("carries the rule through, because a lowercase-only link is weaker evidence", () => {
    expect(mailboxLinks(rows, ["e"]).get("e")?.rule).toBe("lowercase_only");
    expect(mailboxLinks(rows, ["a"]).get("a")?.rule).toBe("gmail");
  });

  it("leaves out an account with no identity row rather than inventing one", () => {
    expect(mailboxLinks(rows, ["nobody"]).has("nobody")).toBe(false);
  });

  it("asks nothing and answers nothing", () => {
    expect(mailboxLinks(rows, []).size).toBe(0);
  });
});

describe("sharedMailboxes", () => {
  it("lists only mailboxes behind more than one account, biggest first", () => {
    const shared = sharedMailboxes(rows);
    expect(shared).toHaveLength(1);
    expect(shared[0]?.canonical).toBe("one@gmail.com");
    expect(shared[0]?.userIds).toEqual(["a", "b", "c"]);
  });

  it("is empty when every account has its own mailbox", () => {
    expect(sharedMailboxes(rows.filter((row) => row.user_id === "d" || row.user_id === "e"))).toEqual([]);
  });
});
