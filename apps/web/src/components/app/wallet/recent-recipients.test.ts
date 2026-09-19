import { describe, expect, it } from "vitest";
import {
  parseRecentRecipients,
  recipientInitials,
  recipientShortName,
  rememberRecipient,
} from "./recent-recipients";

describe("recent recipients", () => {
  it("parses only well-formed entries and never throws", () => {
    expect(parseRecentRecipients(null)).toEqual([]);
    expect(parseRecentRecipients("not json")).toEqual([]);
    expect(parseRecentRecipients('[{"email":"a@b.c","name":"A","at":1},{"email":1}]')).toEqual([
      { email: "a@b.c", name: "A", at: 1 },
    ]);
  });

  it("keeps one entry per address, newest first, capped at five", () => {
    let list = rememberRecipient([], { email: "One@x.ng", name: "One" }, 1);
    list = rememberRecipient(list, { email: "two@x.ng", name: "Two" }, 2);
    list = rememberRecipient(list, { email: "one@x.ng", name: "One Again" }, 3);
    expect(list.map((r) => r.email)).toEqual(["one@x.ng", "two@x.ng"]);
    expect(list[0]!.name).toBe("One Again");
    for (let i = 0; i < 6; i += 1) {
      list = rememberRecipient(list, { email: `n${i}@x.ng`, name: `N${i}` }, 10 + i);
    }
    expect(list).toHaveLength(5);
    expect(list[0]!.email).toBe("n5@x.ng");
  });

  it("falls back to the address when the name is empty", () => {
    expect(rememberRecipient([], { email: "a@b.c", name: "  " }, 1)[0]!.name).toBe("a@b.c");
  });

  it("draws initials and a short name", () => {
    expect(recipientInitials("Tunde Adebayo")).toBe("TA");
    expect(recipientInitials("chidinma")).toBe("CH");
    expect(recipientInitials("ada@vallospaces.com")).toBe("AD");
    expect(recipientShortName("Tunde Adebayo")).toBe("Tunde A.");
    expect(recipientShortName("Sola")).toBe("Sola");
  });
});
