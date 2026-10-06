import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it } from "vitest";
import { axe, closeAxe, hasBrowser } from "@/lib/a11y/axe";
import { wantsPush } from "@/lib/push/preferences";
import { SETTINGS_DEFAULTS } from "@/lib/profile/model";
import { NotificationMatrix, pushFor } from "./NotificationMatrix";

afterAll(closeAxe);

const base = SETTINGS_DEFAULTS.notifications;

describe("the notification matrix (R3-14)", () => {
  it("shows each push cell exactly as the push policy would decide it", () => {
    const cases = [
      { ...base },
      { ...base, messages: false },
      { ...base, messages: false, channels: { messages: { push: true } } },
      { ...base, wallet: false, channels: { bookings: { push: false } } },
    ];
    for (const flags of cases) {
      const doc = { notifications: flags };
      expect(pushFor("bookings", flags)).toBe(wantsPush(doc, "booking"));
      expect(pushFor("messages", flags)).toBe(wantsPush(doc, "message"));
      expect(pushFor("payments", flags)).toBe(wantsPush(doc, "wallet"));
    }
    expect(pushFor("marketing", base)).toBe(false);
  });

  it("draws an event by channel table, a sentence where a channel is not offered, and quiet hours", () => {
    const html = renderToStaticMarkup(<NotificationMatrix initial={base} />);
    expect(html).toMatch(/<table[\s\S]*<caption[^>]*>Notifications by event and channel/);
    for (const row of ["bookings", "messages", "payments", "savedPriceDrops", "marketing"]) {
      expect(html).toContain(`data-testid="matrix-row-${row}"`);
    }
    expect(html).toContain("Not sent by email");
    expect(html).not.toContain('data-testid="matrix-savedPriceDrops-email"');
    expect(html).toContain('data-testid="quiet-hours"');
    expect(html).toContain("Payments still reach you at once.");
    expect(html).not.toMatch(/wallet/i);
  });
});

describe.skipIf(!hasBrowser && !process.env.CI)("the notification matrix (axe)", () => {
  it("has no axe violations", async () => {
    expect(await axe(`<h1>Notifications</h1>${renderToStaticMarkup(<NotificationMatrix initial={base} />)}`)).toEqual([]);
  });
});
