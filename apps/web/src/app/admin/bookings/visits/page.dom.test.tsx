import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The visits desk's door. `requireAdmin("operations")` decides, before a
 * single row is read: an admin or an operations staff member gets the desk,
 * anybody else the site's ordinary 404 (as Provider checks does), and the
 * calendar read is never reached.
 */
const door = vi.hoisted(() => ({ state: "admin" as string, scopes: [] as (string | undefined)[] }));
const reads = vi.hoisted(() => ({ calendar: vi.fn(), detail: vi.fn() }));

vi.mock("@/lib/admin/guard", () => ({
  requireAdmin: async (scope?: string) => {
    door.scopes.push(scope);
    return { state: door.state };
  },
}));
vi.mock("@/lib/admin/reads/visits", async () => {
  const model = await import("@/lib/admin/reads/visits-model");
  return { ...model, getVisitCalendar: reads.calendar, getVisitDetail: reads.detail };
});
vi.mock("@/lib/locale", () => ({ getLocale: async () => "en" }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const { default: AdminVisitsPage } = await import("./page");

beforeEach(() => {
  door.scopes = [];
  reads.calendar.mockReset();
  reads.detail.mockReset();
});

describe("the visits desk's door", () => {
  for (const state of ["not-admin", "signed-out", "unconfigured", "step-up"]) {
    it(`answers ${state} with a 404 and reads nothing`, async () => {
      door.state = state;
      await expect(AdminVisitsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_NOT_FOUND");
      expect(door.scopes).toEqual(["operations"]);
      expect(reads.calendar).not.toHaveBeenCalled();
    });
  }

  it("lets an admin or an operations staff member in, and reads the range the address asks for", async () => {
    door.state = "admin";
    reads.calendar.mockResolvedValue({ state: "ok", data: { rows: [], inRange: 0, cities: [], listers: [] } });
    const element = (await AdminVisitsPage({
      searchParams: Promise.resolve({ view: "month", day: "2026-10-05", state: "confirmed" }),
    })) as { props: { query: { view: string; day: string; state: string | null }; detail: unknown } };
    expect(door.scopes).toEqual(["operations"]);
    expect(reads.calendar).toHaveBeenCalledTimes(1);
    expect(element.props.query).toMatchObject({ view: "month", day: "2026-10-05", state: "confirmed" });
    /* No visit open, so no detail read. */
    expect(reads.detail).not.toHaveBeenCalled();
    expect(element.props.detail).toBeNull();
  });
});
