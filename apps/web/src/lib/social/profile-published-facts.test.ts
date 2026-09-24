import { describe, expect, it } from "vitest";
import { publishedFactsOf } from "./profile-extras";
import { parseSettings, settingsPatchSchema } from "../profile/schema";

/* V-64: a member's occupation and home town are private until switched on. */
describe("what a member's page publishes", () => {
  it("is private by default: both switches start off", () => {
    const privacy = parseSettings({}).privacy;
    expect(privacy.showOccupation).toBe(false);
    expect(privacy.showHomeTown).toBe(false);
    expect(parseSettings({ privacy: { showOccupation: "yes" } }).privacy.showOccupation).toBe(false);
  });

  it("keeps a switch the member turned on, and accepts each as its own patch", () => {
    expect(parseSettings({ privacy: { showHomeTown: true } }).privacy.showHomeTown).toBe(true);
    expect(settingsPatchSchema.safeParse({ privacy: { showOccupation: true } }).success).toBe(true);
  });

  it("prints only what the published door returned", () => {
    expect(publishedFactsOf({})).toEqual({ occupation: null, place: null });
    expect(publishedFactsOf({ occupation: "Market Trader" }).occupation?.name).toBe("Market Trader");
    expect(publishedFactsOf({ lga: "Dunukofia", state: "Anambra" }).place?.label).toBe(
      "Dunukofia, Anambra, Nigeria",
    );
    expect(publishedFactsOf({ occupation: null, lga: null, state: null }).place).toBeNull();
  });
});
