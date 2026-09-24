import { describe, expect, it } from "vitest";
import { getDictionary, LOCALES } from "@vallo/i18n";
import { noWorkspaceDoor, SUPPLY_DOOR_HREF } from "./agent-doors";

/*
 * UX-11 / SUP-15: every /agent route is behind the sign-in gate, so the card
 * shown with no agent profile is only ever read by somebody who IS signed in.
 * It used to say "Not signed in as an agent" and link to /sign-in.
 */
describe("the door for a signed-in member with no listing workspace", () => {
  it("leads to the workspace chooser, never to sign in", () => {
    const door = noWorkspaceDoor(getDictionary("en").agent.mode);
    expect(door.href).toBe("/profile/setup");
    expect(SUPPLY_DOOR_HREF).toBe("/profile/setup");
    expect(door.href).not.toContain("sign-in");
  });

  it("does not tell a signed-in member they are not signed in, in any language", () => {
    const en = noWorkspaceDoor(getDictionary("en").agent.mode);
    expect(en.label).toBe("You are not listing yet");
    expect(en.cta).toBe("Apply to list");
    for (const locale of LOCALES) {
      const door = noWorkspaceDoor(getDictionary(locale).agent.mode);
      expect(door.label.length, locale).toBeGreaterThan(0);
      expect(door.cta.length, locale).toBeGreaterThan(0);
      expect(door.label.toLowerCase()).not.toContain("signed in");
    }
  });
});
