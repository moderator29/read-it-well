import type { TieredObjectName } from "@/design-system/icons/object-assets";
import { formatMoney, type Dictionary, type Locale } from "@vallo/i18n/core";
import {
  NO_INSPECTION_FEE,
  OFF_PLATFORM_SENTENCE,
  PAYMENT_GATE_SENTENCE,
  PROMOTION_ENDS,
  PROMOTION_FULL_DAYS,
  PROMOTION_NOT_ON_SALE,
  PROMOTION_PRICES_PROPOSED,
  PROMOTION_REFUNDED,
  PROMOTION_STARTS,
} from "@/lib/money/copy";
import { PROMOTION_METRICS, promotionTiers } from "@/lib/promotion/tiers";
import { REWARDS_MONTHLY_BUDGET, REWARDS_PENDING_THEN_AVAILABLE } from "@/lib/money/copy";
import type { InviteRewards } from "@/lib/referral/rewards";
import { qualifySentence } from "@/components/app/referral/invite-rewards";

/**
 * THE FEATURE ONBOARDING REGISTRY (north star 14.1, founder directive D11).
 *
 * One system, not fifteen screens. Every first run has the same grammar so a
 * member learns it once: one to three full-page panels, one idea each (a clay
 * object, a display line, one line of body and nothing else), a dot pager, a
 * skip that is always there, and a last panel whose action IS the feature
 * ("Open my desk"), never "Done".
 *
 * This file is the whole of the content and the rules about it, as data, so
 * `first-runs.test.ts` can hold every first run to the grammar without
 * rendering anything. Client-safe: the money sentences it places are
 * constants from `lib/money/copy.ts` (Session 2's), never written here.
 *
 * ONE LIST: the features that exist today. Each has a home route the first
 * run hands the member to, and a page that sends a first-time member here
 * (`gateFirstRun` in `first-run-store.ts`). A first run is written only for a
 * screen that exists, so there is no list of first runs waiting on screens.
 *
 * Forbidden (14.1): sign-in, search, the feed, and anything a member reaches
 * more than weekly. None of those is a key here, and the test says so.
 */

export const MOUNTED_FIRST_RUNS = [
  "host",
  "agent",
  "verification",
  "agreements",
  "invite",
  "passport",
  "analytics",
  /* R3-12: the Owner and Tenant command centres, as the two surfaces that do
     that job today (the tenancy file and the owner's buildings). */
  "tenancy",
  "portfolio",
  /* D60: paid promotion, for listers. Four panels, the spec's own count. */
  "promotion",
] as const;

export type MountedFirstRun = (typeof MOUNTED_FIRST_RUNS)[number];
export type FirstRunFeature = MountedFirstRun;

/**
 * Where each mounted first run hands the member on to: the working feature.
 * Skip lands here too, so skipping is never a dead end.
 */
export const FIRST_RUN_HOME: Readonly<Record<MountedFirstRun, string>> = {
  host: "/host",
  agent: "/agent/dashboard",
  verification: "/agent/verification",
  agreements: "/agreements",
  invite: "/settings/invite",
  passport: "/settings/passport",
  analytics: "/agent/analytics",
  /* A tenancy is reached by its own id, carried in `next`; without one the
     member lands where their tenancies are listed, the tenancy file's own
     declared parent. */
  tenancy: "/bookings",
  portfolio: "/agent/portfolio",
  /* Promotion cannot be bought yet (D38), so the run hands a lister back to
     the listings a promotion would be for; a host's gate carries `next`. */
  promotion: "/agent/listings",
};

export function isMountedFirstRun(value: string | null | undefined): value is MountedFirstRun {
  return (MOUNTED_FIRST_RUNS as readonly string[]).includes(value ?? "");
}

export function firstRunPath(feature: MountedFirstRun): string {
  return `/first-run/${feature}`;
}

/** One idea: a clay object, a display line, one line of body. */
export type FirstRunPanel = {
  object: TieredObjectName;
  title: string;
  body: string;
  /**
   * Rows under the body, for the one first run whose spec asks a panel to
   * carry a table read as prose (promotion's four tiers, its ten figures and
   * what happens after paying). Every other first run has none.
   */
  detail?: FirstRunDetail;
};

export type FirstRunDetail = {
  /** One line over the rows, saying what they are. */
  caption?: string;
  /** "list" reads down; "grid" sets short rows two across. */
  layout: "list" | "grid";
  rows: { term: string; meta?: string; text: string }[];
};

/**
 * THE PANEL COUNT. Every first run is one to three panels (north star 14.1),
 * except where a directive fixes the count: promotion is exactly four, because
 * `VALLO_PROMOTION.md` specifies four screens and forbids a fifth (D60).
 */
export const FIRST_RUN_PANEL_COUNT: Readonly<Partial<Record<MountedFirstRun, number>>> = {
  promotion: 4,
};

export function panelBounds(feature: FirstRunFeature): { min: number; max: number } {
  const exact = FIRST_RUN_PANEL_COUNT[feature];
  return exact === undefined ? { min: 1, max: 3 } : { min: exact, max: exact };
}

export type FirstRunContent = {
  feature: FirstRunFeature;
  /** The feature's name, as it reads inside "Getting started with {feature}". */
  name: string;
  panels: FirstRunPanel[];
  /** The last panel's action: the feature itself. */
  action: string;
};

/**
 * Every first run's panels, resolved against the member's dictionary.
 *
 * The objects are matte symbols (Tier B, D29) from the accepted set, chosen
 * for what each panel says: a clipboard for "what needs you", a key ring for
 * the nights a host opens, a shield for checks, a passport for the passport.
 *
 * `invite` is what the rewards read says (`inviteRewards`), and only the
 * invite's first run reads it. Without it the invite run says nothing either
 * way about a reward (the "unknown" state), so a caller that forgets it can
 * never put "nothing to earn" in front of a running programme.
 */
export function firstRunContent(
  feature: FirstRunFeature,
  t: Dictionary,
  locale?: Locale,
  invite: InviteRewards = { state: "unknown" },
): FirstRunContent {
  const c = t.experienceFeatures.firstRun;
  switch (feature) {
    case "host":
      return {
        feature,
        name: c.host.name,
        action: c.host.action,
        panels: [
          { object: "clipboard-list", title: c.host.p1Title, body: c.host.p1Body },
          { object: "calendar-page", title: c.host.p2Title, body: c.host.p2Body },
          { object: "key-ring", title: c.host.p3Title, body: c.host.p3Body },
        ],
      };
    case "agent":
      return {
        feature,
        name: c.agent.name,
        action: c.agent.action,
        panels: [
          { object: "clipboard-list", title: c.agent.p1Title, body: c.agent.p1Body },
          { object: "key-ring", title: c.agent.p2Title, body: c.agent.p2Body },
        ],
      };
    case "verification":
      return {
        feature,
        name: c.verification.name,
        action: c.verification.action,
        panels: [
          { object: "shield-tick", title: c.verification.p1Title, body: c.verification.p1Body },
          { object: "flag-pole", title: c.verification.p2Title, body: c.verification.p2Body },
          { object: "people-group", title: c.verification.p3Title, body: c.verification.p3Body },
        ],
      };
    case "agreements":
      /* Session 2's sentences, placed rather than paraphrased: the gate
         sentence is exactly what a renter must understand before money. */
      return {
        feature,
        name: c.agreements.name,
        action: c.agreements.action,
        panels: [
          { object: "door-open", title: c.agreements.p1Title, body: NO_INSPECTION_FEE },
          { object: "scroll-unrolled", title: c.agreements.p2Title, body: PAYMENT_GATE_SENTENCE },
          { object: "chat-pair", title: c.agreements.p3Title, body: OFF_PLATFORM_SENTENCE },
        ],
      };
    case "invite":
      return { feature, name: c.invite.name, action: c.invite.action, panels: invitePanels(t, invite, locale) };
    case "passport":
      return {
        feature,
        name: c.passport.name,
        action: c.passport.action,
        panels: [
          { object: "passport-book", title: c.passport.p1Title, body: c.passport.p1Body },
          { object: "padlock", title: c.passport.p2Title, body: c.passport.p2Body },
          { object: "refresh-arrows", title: c.passport.p3Title, body: t.trustVisible.passport.offNote },
        ],
      };
    case "analytics":
      return {
        feature,
        name: c.analytics.name,
        action: c.analytics.action,
        panels: [
          { object: "bars-chart", title: c.analytics.p1Title, body: c.analytics.p1Body },
          { object: "frame-empty", title: c.analytics.p2Title, body: c.analytics.p2Body },
          { object: "padlock", title: c.analytics.p3Title, body: c.analytics.p3Body },
        ],
      };
    case "tenancy":
      /* The tenancy file's own published sentences, placed rather than
         paraphrased, then the one line about its end and renewal. */
      return {
        feature,
        name: c.tenancy.name,
        action: c.tenancy.action,
        panels: [
          { object: "house-heart", title: c.tenancy.p1Title, body: t.afterTheGate.tenancy.lede },
          { object: "book-bookmark", title: c.tenancy.p2Title, body: t.afterTheGate.tenancy.cautionNotHeld },
          { object: "calendar-page", title: c.tenancy.p3Title, body: c.tenancy.p3Body },
        ],
      };
    case "portfolio":
      return {
        feature,
        name: c.portfolio.name,
        action: c.portfolio.action,
        panels: [
          { object: "map-pin", title: c.portfolio.p1Title, body: c.portfolio.p1Body },
          { object: "key-ring", title: c.portfolio.p2Title, body: c.portfolio.p2Body },
          { object: "paper-plane", title: c.portfolio.p3Title, body: c.portfolio.p3Body },
        ],
      };
    case "promotion":
      return promotionFirstRun(t, locale);
  }
}

/**
 * THE INVITE'S PANELS, ONE SET PER STATE OF THE REWARDS READ. They never mix.
 *
 *   not-live  the link, then "There is no reward for inviting" (A5), as before
 *   running   what the invited person gets (the invite door's own claim), what
 *             the member earns and when (`REWARDS_QUALIFY` from the read's
 *             policy), then Pending and Available with the monthly budget in
 *             one line (D62, D64). Money sentences are `lib/money/copy.ts`'s
 *   paused    none: the run cannot mount, and the route hands the member to
 *             the hub, which says the pause and offers no invite (D64)
 *   unknown   the link alone. Nothing about a reward, either way
 */
function invitePanels(t: Dictionary, invite: InviteRewards, locale?: Locale): FirstRunPanel[] {
  const c = t.experienceFeatures.firstRun.invite;
  const door = t.publicDoors.invite;
  const link: FirstRunPanel = { object: "ticket", title: c.p1Title, body: door.rowSub };
  switch (invite.state) {
    case "not-live":
      return [link, { object: "gift-box", title: c.p2Title, body: door.noReward }];
    case "running":
      return [
        { object: "ticket", title: c.running.p1Title, body: door.doorBody },
        { object: "gift-box", title: c.running.p2Title, body: qualifySentence(invite.policy, locale ?? "en") },
        {
          object: "calendar-page",
          title: c.running.p3Title,
          body: `${REWARDS_PENDING_THEN_AVAILABLE} ${REWARDS_MONTHLY_BUDGET}`,
        },
      ];
    case "paused":
      return [];
    case "unknown":
      return [link];
  }
}

/**
 * PAID PROMOTION'S FOUR PANELS (`docs/promotion/VALLO_PROMOTION.md`, "The
 * onboarding"; D60).
 *
 *   1. What it is and is not: both limits in the body, never a footnote.
 *   2. The four tiers side by side as prose (price, days, who it suits), read
 *      from `lib/promotion/tiers.ts`; the prices are marked proposed.
 *   3. What can be measured, with NO invented example: no promotion has run,
 *      so the ten figures are laid out reading "No data", and the panel says
 *      so (the spec's "real example from a real listing" waits for one).
 *   4. Pick, pay, what happens next. Buying is not open (D38), so the body
 *      says so and there is no pay button: the action is the lister's
 *      listings. Start, end, full days and refunds are Session 2's money
 *      sentences.
 *
 * No fifth panel selling value: the spec forbids it, and the panel count is
 * held at exactly four by `FIRST_RUN_PANEL_COUNT`.
 */
function promotionFirstRun(t: Dictionary, locale?: Locale): FirstRunContent {
  const c = t.experienceFeatures.firstRun.promotion;
  const p = t.experienceFeatures.promotion;
  return {
    feature: "promotion",
    name: c.name,
    action: c.action,
    panels: [
      { object: "frame-empty", title: c.p1Title, body: c.p1Body },
      {
        object: "cards-fan",
        title: c.p2Title,
        body: c.p2Body,
        detail: {
          caption: PROMOTION_PRICES_PROPOSED,
          layout: "list",
          rows: promotionTiers().map((tier) => ({
            term: p.tiers[tier.displayKey].name,
            meta: p.tierMeta
              .replace("{price}", formatMoney(tier.proposedPriceKobo, locale))
              .replace("{days}", String(tier.durationDays)),
            text: p.tiers[tier.displayKey].forWhom,
          })),
        },
      },
      {
        object: "bars-chart",
        title: c.p3Title,
        body: c.p3Body,
        detail: {
          caption: c.p3Example,
          layout: "grid",
          rows: PROMOTION_METRICS.map((metric) => ({ term: p.metrics[metric], text: p.noData })),
        },
      },
      {
        object: "calendar-page",
        title: c.p4Title,
        body: PROMOTION_NOT_ON_SALE,
        detail: {
          layout: "list",
          rows: [
            { term: c.starts, text: PROMOTION_STARTS },
            { term: c.ends, text: PROMOTION_ENDS },
            { term: c.fullDays, text: PROMOTION_FULL_DAYS },
            { term: c.refunded, text: PROMOTION_REFUNDED },
          ],
        },
      },
    ],
  };
}

/**
 * Whether a first run may be shown at all: it is a mounted feature, it has
 * its panel count (one to three, or the count a directive fixes), and every
 * panel teaches something (a title and a body).
 */
export function canMount(content: FirstRunContent): boolean {
  const { min, max } = panelBounds(content.feature);
  return (
    isMountedFirstRun(content.feature) &&
    content.panels.length >= min &&
    content.panels.length <= max &&
    content.panels.every((panel) => panel.title.trim().length > 0 && panel.body.trim().length > 0)
  );
}
