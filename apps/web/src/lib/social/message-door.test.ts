import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { messageDoor } from "./message-door";

describe("the Message button on a profile", () => {
  it("never shows on the owner's own profile", () => {
    expect(messageDoor({ isOwner: true, contactPolicy: "OPEN", viewerFollows: false })).toBe("none");
    expect(messageDoor({ isOwner: true, contactPolicy: "REQUEST", viewerFollows: true })).toBe("none");
  });

  it("shows for anybody when the person is open to anyone", () => {
    expect(messageDoor({ isOwner: false, contactPolicy: "OPEN", viewerFollows: false })).toBe("message");
    expect(messageDoor({ isOwner: false, contactPolicy: "OPEN", viewerFollows: true })).toBe("message");
  });

  it("asks a viewer who does not follow a person who asks first to follow, and shows it once they do", () => {
    expect(messageDoor({ isOwner: false, contactPolicy: "REQUEST", viewerFollows: false })).toBe("follow-first");
    expect(messageDoor({ isOwner: false, contactPolicy: "REQUEST", viewerFollows: true })).toBe("message");
  });

  it("is the rule the profile page, the message route and the send all use", () => {
    const src = join(__dirname, "..", "..");
    const page = readFileSync(join(src, "app/(app)/u/[handle]/page.tsx"), "utf8");
    expect(page).toContain("messageDoor({");
    expect(page).toContain('data-testid="profile-follow-to-message"');
    expect(readFileSync(join(src, "lib/messages/direct.ts"), "utf8")).toContain("messageDoor({");
    expect(readFileSync(join(src, "lib/messages/direct-actions.ts"), "utf8")).toContain('read.state === "follow-first"');
    expect(readFileSync(join(src, "app/(app)/u/[handle]/message/page.tsx"), "utf8")).toContain('read.state === "follow-first"');
  });
});
