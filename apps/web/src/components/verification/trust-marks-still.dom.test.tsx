/**
 * A VERIFIED MARK IS QUIET EVERYWHERE EXCEPT THE ONE MOMENT IT IS EARNED
 * (round 5, "something is verified"). In Chromium, on the stylesheets each
 * mark stands on: the tier badge beside a name, the verified avatar, the
 * listing card's Verified pill and its dated proof strip, the verification
 * path's passed rung (its tick and its date), and the approved plate on an
 * ordinary visit. On a page view not one of them may be animated into
 * existence: no running or pending animation anywhere in the mark, read from
 * the computed animations after a frame.
 *
 * What a mark SAYS is held elsewhere (claims.test.ts, promotion-trust.test.ts:
 * byte-identical, never unearned). This holds how it ARRIVES.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  BROWSER_TEST_TIMEOUT,
  closeBrowser,
  hasBrowser,
  mountInBrowser,
  warmBrowser,
} from "@/lib/testing/mount-in-browser";
import { productCss } from "@/lib/testing/product-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const CSS = productCss(
  "app/css/motion.css",
  "app/css/animation.css",
  "app/css/chips.css",
  "app/css/trust-badge.css",
  "app/css/catalogue.css",
  "app/css/status-track.css",
  "components/verification/verification-path.css",
  "components/verification/verified-payoff.css",
);

const ENTRY = `
  import { getDictionary } from "@vallo/i18n";
  import { mount } from "@/lib/testing/browser-root";
  import { TierBadge } from "@/components/trust/TierBadge";
  import { VerifiedAvatar } from "@/components/messages/VerifiedAvatar";
  import { toBadgeTier } from "@/lib/trust/badge-tier";
  import { ListingCard } from "@/components/app/ListingCard";
  import { RENTAL } from "@/app/(dev)/preview/f3/fixtures";
  import { VerificationPath } from "@/components/verification/VerificationPath";
  import { buildPath } from "@/components/verification/verification-path";
  import { KycStatus } from "@/components/verification/KycStatus";
  const t = getDictionary("en");
  /* The harness fixture with the dated trust fields a card reads (as promotion-trust.test.ts dates it). */
  const DATED = { ...RENTAL, verified: true, isDemo: false, listerRole: "agent", listerIdentitySeenAt: "2026-08-12T10:00:00Z", ownershipVerifiedAt: "2026-08-01T00:00:00Z" };
  const rungs = buildPath({
    ladder: { rungs: { identity: { status: "passed", note: null, decidedAt: "2026-03-01T09:00:00Z" }, address: { status: "passed", note: null, decidedAt: "2026-03-04T09:00:00Z" } } },
    documents: null,
  });
  mount(
    <div style={{ width: 358 }}>
      <div id="badge"><TierBadge tier={toBadgeTier("gold")} /></div>
      <div id="avatar"><VerifiedAvatar name="Ada" tier={toBadgeTier("gold")} kind="agent" /></div>
      <div id="card"><ListingCard listing={DATED} locale="en" t={t} /></div>
      <div id="path"><VerificationPath rungs={rungs} copy={t.experienceAccount.verification} locale="en" /></div>
      <div id="plate"><KycStatus status={{ state: "approved" }} locale="en" /></div>
    </div>,
  );
`;

/** Every animation in a mark: on it, or anywhere inside it. */
const MARKS: [name: string, selector: string][] = [
  ["the tier badge beside a name", "#badge .nf-tier-badge"],
  ["the verified avatar", "#avatar > *"],
  ["the listing card's Verified pill", "#card .nf-pcard__mark--verified"],
  ["the path's passed rungs (tick, date)", '#path .nf-vpath__rung[data-state="passed"]'],
  ["the path's connectors and nodes", "#path .nf-vpath"],
  ["the approved plate on an ordinary visit", "#plate section"],
];

describe.skipIf(!hasBrowser && !process.env.CI)("trust marks on a page view", () => {
  it("every earned mark is simply there: nothing animates it into existence", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS });
    try {
      await page.waitForTimeout(60);
      for (const [name, selector] of MARKS) {
        const found = await page.evaluate((sel) => {
          const els = [...document.querySelectorAll(sel)];
          return {
            count: els.length,
            running: els.flatMap((el) => el.getAnimations({ subtree: true }).map((a) => (a as CSSAnimation).animationName ?? "script")),
          };
        }, selector);
        expect(found.count, `${name} is drawn (a renderer that drew nothing would pass by accident)`).toBeGreaterThan(0);
        expect(found.running, name).toEqual([]);
      }
      /* The plain plate carries no payoff furniture at all. */
      expect(await page.locator("#plate .nf-vpass-plate, #plate .nf-vpass__was, #plate .nf-vpass__badge").count()).toBe(0);
      /* And the passed rung says its date, still. */
      expect(await page.locator("#path .nf-vpath__when").allTextContents()).toEqual(["Passed on 1 Mar 2026", "Passed on 4 Mar 2026"]);
    } finally {
      await close();
    }
  });
});
