import type { Dictionary } from "@vallo/i18n/core";
import type { TieredObjectName } from "@/design-system/icons/object-assets";
import { NO_INSPECTION_FEE, OFF_PLATFORM_SENTENCE, PAYMENT_GATE_SENTENCE } from "@/lib/money/copy";

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
};

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
 */
export function firstRunContent(feature: FirstRunFeature, t: Dictionary): FirstRunContent {
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
      return {
        feature,
        name: c.invite.name,
        action: c.invite.action,
        panels: [
          { object: "ticket", title: c.invite.p1Title, body: t.publicDoors.invite.rowSub },
          { object: "gift-box", title: c.invite.p2Title, body: t.publicDoors.invite.noReward },
        ],
      };
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
  }
}

/**
 * Whether a first run may be shown at all: it is a mounted feature, it has
 * one to three panels, and every panel teaches something (a title and a
 * body).
 */
export function canMount(content: FirstRunContent): boolean {
  return (
    isMountedFirstRun(content.feature) &&
    content.panels.length >= 1 &&
    content.panels.length <= 3 &&
    content.panels.every((panel) => panel.title.trim().length > 0 && panel.body.trim().length > 0)
  );
}
