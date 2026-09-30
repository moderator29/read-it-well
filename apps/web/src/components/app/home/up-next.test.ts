import { describe, expect, it } from "vitest";
import { hasUpNext, pickUpNext, viewingWhen } from "./up-next";

const NOW = new Date("2026-09-30T09:00:00Z"); // 10:00 in Lagos

const viewing = (over: Partial<Parameters<typeof pickUpNext>[0]["viewings"][number]> = {}) => ({
  id: "v1",
  state: "CONFIRMED",
  slotAt: "2026-10-03T13:00:00Z",
  listingTitle: "Two bedroom flat in Yaba",
  counterpartName: "Tunde",
  ...over,
});
const stay = (over: Partial<Parameters<typeof pickUpNext>[0]["stays"][number]> = {}) => ({
  id: "s1",
  status: "CONFIRMED",
  title: "Lekki shortlet",
  checkIn: "2026-10-10",
  checkOut: "2026-10-12",
  dateRange: "Sat 10 Oct to Mon 12 Oct",
  ...over,
});
const thread = (over: Partial<Parameters<typeof pickUpNext>[0]["threads"][number]> = {}) => ({
  id: "t1",
  counterpartName: "Ada",
  listingTitle: "Ikoyi duplex",
  lastMessage: "See you then",
  whenLabel: "09:40",
  unread: 2,
  ...over,
});

describe("pickUpNext", () => {
  it("is empty, and hidden, when the account has nothing coming", () => {
    const next = pickUpNext({ viewings: [], stays: [], threads: [] }, NOW);
    expect(hasUpNext(next)).toBe(false);
  });

  it("takes only a confirmed viewing that is still ahead, soonest first", () => {
    const next = pickUpNext(
      {
        viewings: [
          viewing({ id: "requested", state: "REQUESTED" }),
          viewing({ id: "past", slotAt: "2026-09-29T13:00:00Z" }),
          viewing({ id: "later", slotAt: "2026-10-08T13:00:00Z" }),
          viewing({ id: "soon", slotAt: "2026-10-01T13:00:00Z" }),
          viewing({ id: "noslot", slotAt: null }),
        ],
        stays: [],
        threads: [],
      },
      NOW,
    );
    expect(next.viewing?.id).toBe("soon");
    expect(next.viewing?.href).toContain("#ix-soon");
  });

  it("takes the soonest live stay and says when the guest is staying now", () => {
    const next = pickUpNext(
      {
        viewings: [],
        stays: [
          stay({ id: "cancelled", status: "CANCELLED", checkIn: "2026-10-01", checkOut: "2026-10-02" }),
          stay({ id: "over", checkIn: "2026-09-20", checkOut: "2026-09-30" }),
          stay({ id: "later" }),
          stay({ id: "now", checkIn: "2026-09-29", checkOut: "2026-10-02" }),
        ],
        threads: [],
      },
      NOW,
    );
    expect(next.stay).toMatchObject({ id: "now", phase: "now", href: "/bookings/now" });
  });

  it("marks a request the host has not answered as pending", () => {
    const next = pickUpNext({ viewings: [], stays: [stay({ status: "PENDING" })], threads: [] }, NOW);
    expect(next.stay?.phase).toBe("pending");
  });

  it("takes the latest thread with unread messages and none that are read", () => {
    const next = pickUpNext(
      { viewings: [], stays: [], threads: [thread({ id: "read", unread: 0 }), thread({ id: "u1" }), thread({ id: "u2" })] },
      NOW,
    );
    expect(next.thread).toMatchObject({ id: "u1", unread: 2, href: "/messages/u1" });
    const none = pickUpNext({ viewings: [], stays: [], threads: [thread({ unread: 0 })] }, NOW);
    expect(none.thread).toBeNull();
  });
});

describe("viewingWhen", () => {
  it("prints the Lagos day and time", () => {
    expect(viewingWhen("2026-10-03T13:00:00Z")).toBe("Sat 3 Oct, 2:00 pm");
  });
});
