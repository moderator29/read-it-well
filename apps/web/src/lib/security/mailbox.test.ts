import { describe, expect, it } from "vitest";
import { mailboxKey } from "./mailbox";

describe("mailboxKey", () => {
  it("folds Gmail dots, +tags and googlemail.com into one mailbox", () => {
    for (const a of ["Some.One@gmail.com", "someone+x@gmail.com", "s.o.meone+y@googlemail.com", " SOMEONE@GMAIL.COM "]) {
      expect(mailboxKey(a)).toBe("someone@gmail.com");
    }
  });
  it("drops a +tag elsewhere but keeps dots there", () => {
    expect(mailboxKey("first.last+promo@example.com")).toBe("first.last@example.com");
  });
  it("leaves what it cannot take apart as it is, lowercased", () => {
    expect(mailboxKey("no-at-sign")).toBe("no-at-sign");
    expect(mailboxKey("a@b@c.com")).toBe("a@b@c.com");
  });
});
