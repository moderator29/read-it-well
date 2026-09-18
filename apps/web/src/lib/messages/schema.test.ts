import { describe, expect, it } from "vitest";
import {
  startBookingThreadSchema,
  startConversationSchema,
  startReservationThreadSchema,
} from "./schema";

/**
 * The three ways a thread starts, and what each one accepts at the door.
 *
 * The listing schema is deliberately loose: a seed catalogue id is a valid
 * input and the action decides what an honest answer looks like for it. The
 * two context schemas are deliberately strict: a reservation or booking id is
 * always a uuid the caller already holds, so anything else is refused before
 * a database is asked. Pinning both keeps the seam from drifting when one is
 * edited for the other's reason.
 */
const UUID = "11111111-1111-4111-8111-111111111111";

describe("startConversationSchema", () => {
  it("accepts a catalogue id, because the action answers those honestly", () => {
    expect(startConversationSchema.safeParse({ listingId: "lekki-shortlet-3" }).success).toBe(true);
  });

  it("refuses an empty id", () => {
    expect(startConversationSchema.safeParse({ listingId: "" }).success).toBe(false);
  });
});

describe("startReservationThreadSchema", () => {
  it("accepts a uuid", () => {
    expect(startReservationThreadSchema.safeParse({ reservationId: UUID }).success).toBe(true);
  });

  it("refuses anything that is not a uuid, with a sentence for the field", () => {
    const result = startReservationThreadSchema.safeParse({ reservationId: "tonight" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["reservationId"]);
      expect(result.error.issues[0]?.message).toBe("This reservation could not be identified.");
    }
  });
});

describe("startBookingThreadSchema", () => {
  it("accepts a uuid", () => {
    expect(startBookingThreadSchema.safeParse({ bookingId: UUID }).success).toBe(true);
  });

  it("refuses a missing id", () => {
    expect(startBookingThreadSchema.safeParse({}).success).toBe(false);
  });
});
