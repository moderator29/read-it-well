import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HOTEL_ROOM_FEE_BPS, hotelFeeSentence } from "./hotel-fee";

const REPO = join(process.cwd(), "..", "..");

/** The migration that seeds the hotel_room rate, pending or, once applied, recorded. */
function commissionMigration(): string {
  for (const dir of [join(REPO, "supabase", "migrations", "pending"), join(REPO, "supabase", "migrations")]) {
    if (!existsSync(dir)) continue;
    const file = readdirSync(dir).find((name) => name.endsWith("hotel_room_commission.sql"));
    if (file) return readFileSync(join(dir, file), "utf8");
  }
  throw new Error("the hotel room commission migration is neither pending nor recorded");
}

describe("Vallo's fee on a paid hotel room, as a host reads it", () => {
  it("says 10 percent of the charge, from the hotel's share, with nothing added for the guest", () => {
    const sentence = hotelFeeSentence();
    expect(sentence).toContain("fee is 10% of the charge");
    expect(sentence).toContain("taken from your share");
    expect(sentence).toContain("with nothing added");
    expect(sentence).toContain("no fee on a booking that is not paid");
  });

  it("is the rate the database seeds for the hotel_room scope", () => {
    expect(commissionMigration()).toMatch(new RegExp(`'hotel_room', ${HOTEL_ROOM_FEE_BPS},`));
  });
});
