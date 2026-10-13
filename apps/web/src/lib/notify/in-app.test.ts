import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { settingsSwitchIsOff, switchForKind, writeInAppNotice, writeInAppNotices, type NoticeRow } from "./in-app";

/**
 * THE IN-APP DOOR HONOURS THE SWITCHES `private.notify` HONOURS.
 *
 * Bug: `announce()` and a dozen server actions wrote straight into
 * `public.notifications`, skipping the person's Bookings and Messages
 * switches. These tests hold the app-side door to the database function's
 * rule, kind for kind, and a source scan holds every writer to the door.
 */

const GUEST = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

function notice(over: Partial<NoticeRow> = {}): NoticeRow {
  return {
    user_id: GUEST,
    kind: "booking",
    title: "Your booking request was not accepted",
    body: "The host could not take these dates.",
    href: "/bookings",
    ...over,
  };
}

type Fake = {
  profileReads: string[][];
  inserts: unknown[];
  from: (table: string) => unknown;
};

/** Just enough Supabase: profiles.select().in() and notifications.insert(). */
function fakeClient(opts: {
  settings?: Record<string, unknown>;
  profileReadThrows?: boolean;
  profileReadError?: boolean;
  insertError?: string;
  insertThrows?: boolean;
} = {}): Fake {
  const profileReads: string[][] = [];
  const inserts: unknown[] = [];
  return {
    profileReads,
    inserts,
    from(table: string) {
      if (table === "profiles") {
        return {
          select: () => ({
            in: async (_column: string, ids: string[]) => {
              profileReads.push(ids);
              if (opts.profileReadThrows) throw new Error("profiles unreachable");
              if (opts.profileReadError) return { data: null, error: { message: "denied" } };
              return {
                data: ids.filter((id) => opts.settings && id in opts.settings).map((id) => ({ id, settings: opts.settings![id] })),
                error: null,
              };
            },
          }),
        };
      }
      if (table === "notifications") {
        return {
          insert: async (rows: unknown) => {
            if (opts.insertThrows) throw new Error("socket closed");
            if (opts.insertError) return { error: { message: opts.insertError } };
            inserts.push(rows);
            return { error: null };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
}

describe("which switch governs which kind (private.notify's own mapping)", () => {
  it("maps booking to Bookings and message to Messages, and nothing else", () => {
    expect(switchForKind("booking")).toBe("bookings");
    expect(switchForKind("message")).toBe("messages");
    for (const kind of ["wallet", "listing", "agent", "support", "system", "social"] as const) {
      expect(switchForKind(kind)).toBeNull();
    }
  });

  it("silences only on an explicit false", () => {
    expect(settingsSwitchIsOff({ notifications: { bookings: false } }, "bookings")).toBe(true);
    expect(settingsSwitchIsOff({ notifications: { bookings: true } }, "bookings")).toBe(false);
    expect(settingsSwitchIsOff({ notifications: { messages: false } }, "bookings")).toBe(false);
    expect(settingsSwitchIsOff({ notifications: { bookings: "false" } }, "bookings")).toBe(false);
    expect(settingsSwitchIsOff({ notifications: { bookings: 0 } }, "bookings")).toBe(false);
    expect(settingsSwitchIsOff({ notifications: null }, "bookings")).toBe(false);
    expect(settingsSwitchIsOff({ notifications: [false] }, "bookings")).toBe(false);
    expect(settingsSwitchIsOff({}, "bookings")).toBe(false);
    expect(settingsSwitchIsOff(null, "bookings")).toBe(false);
    expect(settingsSwitchIsOff("bookings", "bookings")).toBe(false);
    expect(settingsSwitchIsOff([], "bookings")).toBe(false);
  });
});

describe("writing one notice", () => {
  it("does not write a booking notice for a person who switched Bookings off", async () => {
    const db = fakeClient({ settings: { [GUEST]: { notifications: { bookings: false } } } });
    const result = await writeInAppNotice(db as never, notice());
    expect(result).toEqual({ written: 0, skipped: 1, error: null });
    expect(db.inserts).toEqual([]);
  });

  it("does not write a message notice for a person who switched Messages off", async () => {
    const db = fakeClient({ settings: { [GUEST]: { notifications: { messages: false } } } });
    const result = await writeInAppNotice(db as never, notice({ kind: "message" }));
    expect(result).toEqual({ written: 0, skipped: 1, error: null });
    expect(db.inserts).toEqual([]);
  });

  it("each switch governs only its own kind", async () => {
    const db = fakeClient({ settings: { [GUEST]: { notifications: { bookings: false } } } });
    const result = await writeInAppNotice(db as never, notice({ kind: "message" }));
    expect(result.written).toBe(1);
    const other = fakeClient({ settings: { [GUEST]: { notifications: { messages: false } } } });
    expect((await writeInAppNotice(other as never, notice())).written).toBe(1);
  });

  it("writes it, as one object, when the switch is on or never touched", async () => {
    const on = fakeClient({ settings: { [GUEST]: { notifications: { bookings: true } } } });
    expect(await writeInAppNotice(on as never, notice())).toEqual({ written: 1, skipped: 0, error: null });
    expect(on.inserts).toEqual([notice()]);

    const untouched = fakeClient({ settings: { [GUEST]: {} } });
    expect((await writeInAppNotice(untouched as never, notice())).written).toBe(1);

    const noProfile = fakeClient({ settings: {} });
    expect((await writeInAppNotice(noProfile as never, notice())).written).toBe(1);
  });

  it("never reads a profile for a kind no switch governs", async () => {
    for (const kind of ["listing", "agent", "system", "wallet", "support", "social"] as const) {
      const db = fakeClient({ settings: { [GUEST]: { notifications: { bookings: false, messages: false } } } });
      const result = await writeInAppNotice(db as never, notice({ kind }));
      expect(result.written).toBe(1);
      expect(db.profileReads).toEqual([]);
    }
  });

  it("fails open: an unreadable profile never silences a notice", async () => {
    for (const opts of [{ profileReadThrows: true }, { profileReadError: true }]) {
      const db = fakeClient(opts);
      const result = await writeInAppNotice(db as never, notice());
      expect(result).toEqual({ written: 1, skipped: 0, error: null });
      expect(db.inserts).toHaveLength(1);
    }
  });

  it("reports an insert that fails, and one that throws, without throwing", async () => {
    const refused = await writeInAppNotice(fakeClient({ insertError: "permission denied" }) as never, notice({ kind: "listing" }));
    expect(refused).toEqual({ written: 0, skipped: 0, error: { message: "permission denied" } });
    const thrown = await writeInAppNotice(fakeClient({ insertThrows: true }) as never, notice({ kind: "listing" }));
    expect(thrown.written).toBe(0);
    expect(thrown.error?.message).toBe("socket closed");
  });
});

describe("writing several notices", () => {
  it("leaves out only the people who switched off, with one read and one insert", async () => {
    const db = fakeClient({
      settings: {
        [GUEST]: { notifications: { bookings: false } },
        [OTHER]: { notifications: { bookings: true } },
      },
    });
    const rows = [notice(), notice({ user_id: OTHER }), notice({ user_id: OTHER, kind: "listing" })];
    const result = await writeInAppNotices(db as never, rows);
    expect(result).toEqual({ written: 2, skipped: 1, error: null });
    expect(db.profileReads).toEqual([[GUEST, OTHER]]);
    expect(db.inserts).toEqual([[rows[1], rows[2]]]);
  });

  it("writes nothing and does not touch the table when everyone switched off", async () => {
    const db = fakeClient({ settings: { [GUEST]: { notifications: { bookings: false } } } });
    const result = await writeInAppNotices(db as never, [notice(), notice()]);
    expect(result).toEqual({ written: 0, skipped: 2, error: null });
    expect(db.inserts).toEqual([]);
  });

  it("does nothing for no notices", async () => {
    const db = fakeClient();
    expect(await writeInAppNotices(db as never, [])).toEqual({ written: 0, skipped: 0, error: null });
    expect(db.profileReads).toEqual([]);
  });

  it("passes a batch insert failure back for the cron to alert on", async () => {
    const db = fakeClient({ insertError: "boom" });
    const result = await writeInAppNotices(db as never, [notice({ kind: "listing" }), notice({ kind: "listing", user_id: OTHER })]);
    expect(result.error).toEqual({ message: "boom" });
    expect(result.written).toBe(0);
  });
});

/* THE SOURCE SCAN. Nothing in the app may write into public.notifications
   except this door, or the switches are bypassed again by the next action. */
const SRC = fileURLToPath(new URL("../../", import.meta.url));

function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      sources(full, out);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

describe("no app code writes a notification around the door", () => {
  it("has exactly one insert into public.notifications, and it is in lib/notify/in-app.ts", () => {
    const writers: string[] = [];
    for (const file of sources(SRC)) {
      const text = readFileSync(file, "utf8");
      /* `.from("notifications")` followed, possibly across lines, by
         `.insert(` or `.upsert(`. */
      if (/\.from\(\s*["'`]notifications["'`]\s*\)\s*\.(insert|upsert)\s*\(/.test(text)) {
        writers.push(relative(SRC, file));
      }
    }
    expect(writers).toEqual(["lib/notify/in-app.ts"]);
  });
});
