/**
 * Where every notification opens.
 *
 * Two halves. `notificationHref` is held to its two jobs (same-origin paths
 * only, and the legacy links mapped). Then every link shape a database
 * function or an app write puts in `public.notifications.href` is resolved
 * against the real route tree under `src/app` plus the redirects in
 * `next.config.ts`, so a link to a page that does not exist fails here rather
 * than on somebody's phone. The `/events/<id>` links that failed this until
 * migration 20260928234231 are kept in the list, in their mapped form, so a
 * row written before the fix is proved to open a real page too.
 *
 * The list is read off the live catalogue (every function that calls
 * `private.notify` or `private.notify_social`, or inserts into
 * public.notifications) and off every `.from("notifications").insert` in the
 * app, on 28 September 2026. It is a list, not a scan of pg_proc: this suite
 * has no database.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { notificationHref, toNotificationItem } from "./links";

const APP = fileURLToPath(new URL("../../app", import.meta.url));
const NEXT_CONFIG = fileURLToPath(new URL("../../../next.config.ts", import.meta.url));

/** Every page route as a matcher, with route groups dropped and dynamic segments as wildcards. */
function routes(): RegExp[] {
  const out: RegExp[] = [];
  const walk = (dir: string, segments: string[]) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        if (name.startsWith("_") || name.startsWith("@")) continue;
        walk(full, /^\(.*\)$/.test(name) ? segments : [...segments, name]);
      } else if (name === "page.tsx" || name === "page.ts") {
        const pattern = segments
          .map((s) => (/^\[\[?\.\.\./.test(s) ? ".+" : /^\[.*\]$/.test(s) ? "[^/]+" : s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
          .join("/");
        out.push(new RegExp(`^/${pattern}$`));
      }
    }
  };
  walk(APP, []);
  return out;
}

/** The redirect sources in next.config, as matchers. */
function redirects(): RegExp[] {
  /* Only the redirects() block: headers() carries a catch-all `/:path*`
     source that would make every path look reachable. */
  const config = readFileSync(NEXT_CONFIG, "utf8");
  const start = config.indexOf("async redirects()");
  const end = config.indexOf("async headers()", start);
  const source = config.slice(start, end > start ? end : undefined);
  return [...source.matchAll(/source:\s*"([^"]+)"/g)].map(([, s]) => {
    const pattern = s!
      .split("/")
      .map((seg) => (seg.startsWith(":") ? (seg.endsWith("*") ? ".*" : "[^/]+") : seg))
      .join("/");
    return new RegExp(`^${pattern}$`);
  });
}

const ROUTES = routes();
const REDIRECTS = redirects();

function resolves(href: string): boolean {
  const path = href.split(/[?#]/)[0]!;
  return ROUTES.some((r) => r.test(path)) || REDIRECTS.some((r) => r.test(path));
}

const ID = "33333333-3333-4333-8333-333333333333";

/** [where it is written, the href it writes]. */
const WRITTEN: [string, string][] = [
  ["agreement_tell_both, agreement_open_rent_as, admin_decide_guarantee_claim, admin_mark_guarantee_claim_paid", `/agreements/${ID}`],
  ["close_listings, inspection_truth_consequences, owner_heartbeat_sweep, mandate_award, admin listing decision", "/agent/listings"],
  ["close_listings (the renter side)", "/search?q=Yaba"],
  ["complete_ended_stays, notify_booking_change, notify_reservation, record_booking_no_show", "/agent/bookings"],
  ["grant_staff_role", "/admin"],
  ["admin_grant_staff", "/admin/handbook"],
  ["admin_revoke_staff", "/home"],
  ["notify_badge", "/profile"],
  ["notify_badge, notify_bio_status, notify_follow", "/u/ada"],
  ["notify_follow", "/around"],
  ["notify_booking_change, notify_payout_account", "/agent/earnings"],
  ["notify_booking_change, notify_booking_refund, notify_reservation, scam_recall_send, agent bookings action", "/bookings"],
  ["admin bookings action", "/bookings?side=stays&from=stays"],
  ["notify_booking_change, notify_inspection_change, safety_share_sweep, name_inspection_delegate", "/inspections"],
  ["notify_booking_change, principal_apply_answer", `/rent/pay/${ID}`],
  ["notify_booking_change, notify_booking_refund", "/trips"],
  ["notify_inspection_change, answer_inspection_delegation", "/agent/inspections"],
  ["name_inspection_delegate", `/inspections/gate/${ID}`],
  ["notify_message (guest side), scam_recall_send", `/messages/${ID}`],
  ["notify_message (agent side)", `/agent/messages/${ID}`],
  ["notify_new_device", `/settings/devices/alert?d=${ID}`],
  ["report_not_me", "/settings/devices"],
  ["notify_post_insert, notify_post_status, notify_reaction, notify_repost, fan_out_post, notify_report", `/post/${ID}`],
  ["notify_report, notify_review_response, answer_brief", `/listing/${ID}`],
  ["notify_report", "/notifications"],
  ["notify_reservation", "/host/reservations"],
  ["notify_review", "/agent/reviews"],
  ["notify_story_*", `/stories/${ID}`],
  ["notify_support_reply", `/support/messages/${ID}`],
  ["reinstate_agent, suspend_agent", "/agent"],
  ["review_kyc_document", "/verification"],
  ["sweep_price_check_watches", "/price"],
  ["answer_brief", "/saved/searches#briefs"],
  ["mandate_invite, mandate_pitch", "/agent/portfolio"],
  ["offer_business_transfer, respond_to_business_transfer, withdraw_business_transfer, close_future_commitments", "/host/transfer"],
  ["respond_to_business_transfer, admin business decision", "/host"],
  ["notify_event_insert, notify_event_change, close_future_commitments", "/around/yaba-unilag"],
  ["admin verification decision", "/agent/verification"],
  ["registration actions, admin registration decision", "/profile/application"],
  ["payment instrument notices, admin payments", "/settings/payments"],
  ["Around place decisions", "/around/settings"],
  ["saved search alerts", "/saved/searches"],
  ["rows written before Track A", "/wallet"],
  ["rows written before migration 20260928234231", `/events/${ID}`],
  ["rows written before migration 20260928234231", "/verify"],
];

describe("notificationHref", () => {
  it("passes an in-app path through unchanged", () => {
    expect(notificationHref("/agent/messages/abc")).toBe("/agent/messages/abc");
    expect(notificationHref(" /bookings?side=stays ")).toBe("/bookings?side=stays");
  });

  it("refuses anything that would leave the site", () => {
    for (const bad of [
      "https://evil.example/x",
      "//evil.example",
      "/\\evil.example",
      "javascript:alert(1)",
      "bookings",
      /* A URL parser strips tab and newline, which would turn these into
         "//evil.com": another host. */
      "/\t/evil.com",
      "/\n/evil.com",
      "/\r/evil.com",
      "/bookings\u0000",
      "/\u007F/evil.com",
    ]) {
      expect(notificationHref(bad), bad).toBeNull();
    }
  });

  it("treats empty as no link", () => {
    expect(notificationHref(null)).toBeNull();
    expect(notificationHref(undefined)).toBeNull();
    expect(notificationHref("   ")).toBeNull();
  });

  it("sends an /events link, which never had a page, to Around", () => {
    expect(notificationHref(`/events/${ID}`)).toBe("/around");
    expect(notificationHref("/events")).toBe("/around");
    expect(notificationHref(`/events/${ID}?x=1`)).toBe("/around");
  });

  it("sends /verify straight to /verification, and leaves look-alikes alone", () => {
    expect(notificationHref("/verify")).toBe("/verification");
    expect(notificationHref("/verify?resubmit=identity")).toBe("/verification");
    expect(notificationHref("/verification")).toBe("/verification");
    expect(notificationHref("/verifyx")).toBe("/verifyx");
  });

  it("maps a stored row, realtime or server-loaded, through the same rule", () => {
    const item = toNotificationItem({
      id: ID,
      kind: "social",
      title: "Your event is live",
      body: null,
      href: `/events/${ID}`,
      read_at: null,
      created_at: "2026-09-28T10:00:00+00:00",
    });
    expect(item).toEqual({
      id: ID,
      kind: "social",
      title: "Your event is live",
      body: null,
      href: "/around",
      read: false,
      createdAt: "2026-09-28T10:00:00+00:00",
    });
  });
});

describe("every link a notification is written with opens a real page", () => {
  it("found the route tree and the redirects", () => {
    expect(ROUTES.length).toBeGreaterThan(50);
    expect(REDIRECTS.length).toBeGreaterThan(5);
  });

  it("the raw /events link is the one that did not (the reason for the mapping)", () => {
    expect(resolves(`/events/${ID}`)).toBe(false);
  });

  it.each(WRITTEN)("%s: %s", (_where, href) => {
    const opened = notificationHref(href);
    expect(opened).not.toBeNull();
    expect(resolves(opened!), `${href} -> ${opened}`).toBe(true);
  });
});
