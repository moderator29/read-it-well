/**
 * D64: WHEN THE PLATFORM BUDGET IS REACHED, REWARDS PAUSE, AND NOTHING KEEPS
 * INVITING UNDER A REWARD.
 *
 * Every member rewards surface is rendered for real (the route's own page
 * function, with the request-bound modules stubbed) in two months: running,
 * and paused. The markup is then scanned:
 *
 *   paused   no invite control (copy, share, share sheet, WhatsApp, QR, the
 *            link, the ticket) and no reward-promising wording renders; the
 *            pause sentence does; everything already earned (the figures,
 *            Withdraw, the history with its processing withdrawal, the
 *            referral rows) still renders with the sentence that says it is
 *            paid; and the invite's first run is not shown
 *   running  exactly what it drew before: the invite card, the campaign, the
 *            per-referral reward, the ticket, the first run, and no pause
 *
 * Values are structural, not real people (a slot code and slot names).
 */
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { REWARDS_PAID_FROM, REWARDS_QUALIFY } from "@/lib/money/copy";
import { REWARDS_PAUSED_EARNED_LINE } from "@/components/app/referral/money-words";
import type { RewardsRead, RewardsSnapshot } from "@/lib/referral/rewards";

const state = vi.hoisted(() => ({
  read: { state: "not-live" } as RewardsRead,
  gate: [] as string[],
}));

vi.mock("@/lib/locale", () => ({ getLocale: async () => "en" }));
vi.mock("@/components/app/PageHeader", () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock("@/lib/actions/session", () => ({ resolveSession: async () => ({ state: "signed-in" }) }));
vi.mock("@/components/app/feature-onboarding/first-run-store", () => ({
  gateFirstRun: async (feature: string) => {
    state.gate.push(feature);
  },
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/referral/server", () => ({ myInviteCode: async () => "K7M2QX" }));
vi.mock("@/lib/referral/rewards-read", () => ({
  readMyRewards: async () => state.read,
  rewardsSource: { read: async () => ({ state: "not-live" }) },
  /* Open, so the withdraw page draws the flow itself in both months. */
  withdrawActions: { quote: async () => ({ ok: false, reason: "unavailable" }), confirm: async () => ({ ok: false, reason: "unavailable" }) },
}));

const t = getDictionary("en");
const r = t.experienceRewards;
const door = t.publicDoors.invite;

const RUNNING: RewardsSnapshot = {
  policy: { rewardPerReferralMinor: 7_000, monthlyCap: 1_500, withdrawMinimumMinor: 100_000 },
  programme: { state: "running" },
  balance: { availableMinor: 420_000, pendingMinor: 70_000, lifetimeMinor: 630_000 },
  referrals: [
    { id: "r1", firstName: "Slot", status: "qualified", joinedOn: "2026-09-02", qualifiedOn: "2026-09-09" },
    { id: "r2", firstName: null, status: "pending", joinedOn: "2026-10-01", qualifiedOn: null },
  ],
  history: [
    { id: "h1", kind: "referral", amountMinor: 7_000, at: "2026-09-09T10:12:00+01:00", state: "done", firstName: "Slot", withdrawal: null },
    {
      id: "h2",
      kind: "withdrawal",
      amountMinor: 100_000,
      at: "2026-10-05T18:22:00+01:00",
      state: "processing",
      firstName: null,
      withdrawal: { feeMinor: 5_000, bankName: "Slot Bank", accountLast4: "0001" },
    },
  ],
  campaign: { id: "c1", name: "Slot campaign", target: 20, reached: 12, bonusMinor: 100_000, endsOn: "2026-10-31" },
  destination: { bankName: "Slot Bank", accountLast4: "0001", accountName: "Slot" },
};
const PAUSED: RewardsSnapshot = { ...RUNNING, programme: { state: "paused", resumesOn: null } };

/* Every control that sends the invite link, by the test ids the components give them. */
const INVITE_CONTROLS = [
  "rewards-invite",
  "rewards-invite-copy",
  "rewards-invite-share",
  "rewards-invite-qr-toggle",
  "rewards-invite-qr",
  "rewards-invite-url",
  "invite-ticket",
  "invite-copy",
  "invite-share",
  "invite-url",
];

/* Wording that promises a reward for inviting, or offers to send the link. */
const REWARD_PROMISES = [
  r.policy.perReferral,
  r.policy.monthlyCap,
  r.campaign.label,
  r.campaign.bonus,
  REWARDS_QUALIFY.split("{reward}")[0]!,
  r.invite.copy,
  r.invite.share,
  r.invite.qrShow,
  r.invite.sheetTitle,
  r.referrals.emptyAction,
  door.whatsapp,
  "/join/",
  "wa.me",
];

function html(element: ReactElement): string {
  return renderToStaticMarkup(element)
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

function expectNoInvite(markup: string, where: string) {
  for (const id of INVITE_CONTROLS) expect(markup, `${where}: ${id}`).not.toContain(`data-testid="${id}"`);
  for (const words of REWARD_PROMISES) expect(markup, `${where}: ${words}`).not.toContain(words);
}

function expectPause(markup: string, where: string) {
  expect(markup, where).toContain(r.pause.title);
  expect(markup, where).toContain(r.pause.body);
  expect(markup, where).toContain(REWARDS_PAUSED_EARNED_LINE);
}

async function page(load: () => Promise<{ default: (props: never) => Promise<ReactElement> }>, props: object = {}) {
  const Page = (await load()).default as unknown as (p: object) => Promise<ReactElement>;
  return html(await Page(props));
}

const PAGES = {
  rewards: () => page(() => import("./page")),
  referrals: () => page(() => import("./referrals/page")),
  history: () => page(() => import("./history/page")),
  withdraw: () => page(() => import("./withdraw/page")),
  hub: () => page(() => import("../settings/invite/page"), { searchParams: Promise.resolve({}) }),
  how: () => page(() => import("../settings/invite/how-it-works/page")),
};

beforeEach(() => {
  state.gate = [];
});

describe("D64: a paused month", () => {
  beforeEach(() => {
    state.read = { state: "ready", snapshot: PAUSED };
  });

  it("says the pause on every rewards surface and the invite hub, and offers no invite under a reward", async () => {
    for (const [name, render] of Object.entries(PAGES)) {
      const markup = await render();
      expectPause(markup, name);
      expectNoInvite(markup, name);
    }
  });

  it("says where the invite went on the surfaces that offer it when running", async () => {
    for (const name of ["rewards", "referrals", "hub"] as const) {
      expect(await PAGES[name](), name).toContain(r.pause.inviteOff);
    }
  });

  it("does not show the invite's first run while paused", async () => {
    await PAGES.hub();
    expect(state.gate).toEqual([]);
  });

  it("still draws everything already earned, with the sentence that it is paid", async () => {
    const dashboard = await PAGES.rewards();
    expect(dashboard).toContain('data-testid="rewards-available"');
    /* The money kit draws the naira sign in its own span (the unit in grey,
       D74), so the figures are read as text, the way a reader sees them. */
    const shown = dashboard.replace(/<[^>]+>/g, "");
    expect(shown).toContain("₦4,200");
    expect(shown).toContain("₦700");
    expect(shown).toContain("₦6,300");
    expect(dashboard).toContain('data-testid="rewards-withdraw-link"');
    expect(dashboard).toContain('data-testid="rewards-policy-minimum"');
    /* The sentence under a pause says it is paid, whichever constant is in force. */
    expect(REWARDS_PAUSED_EARNED_LINE).toMatch(/\bpaid\b/);
    expect(REWARDS_PAUSED_EARNED_LINE.toLowerCase()).not.toMatch(new RegExp(["wal", "let"].join("")));

    const history = await PAGES.history();
    expect(history).toContain(r.history.state.processing);
    expect(history).toContain("Slot qualified");

    const referrals = await PAGES.referrals();
    expect(referrals).toContain("Slot");
    expect(referrals).toContain(r.referrals.status.qualified);

    const withdraw = await PAGES.withdraw();
    expect(withdraw).toContain(r.withdraw.amountLabel);
    expect(withdraw).toContain(REWARDS_PAID_FROM);
  });

  it("names a resume day only when the read gives one", async () => {
    expect(await PAGES.rewards()).not.toContain("due to resume");
    state.read = { state: "ready", snapshot: { ...PAUSED, programme: { state: "paused", resumesOn: "2026-11-01" } } };
    expect(await PAGES.rewards()).toContain("They are due to resume on 1 November 2026.");
    state.read = { state: "ready", snapshot: { ...PAUSED, programme: { state: "paused", resumesOn: "next month" } } };
    expect(await PAGES.rewards()).not.toContain("due to resume");
  });

  it("drops the empty referral list's invite while paused", async () => {
    state.read = { state: "ready", snapshot: { ...PAUSED, referrals: [] } };
    const markup = await PAGES.referrals();
    expect(markup).toContain(r.referrals.emptyTitle);
    expect(markup).not.toContain(r.referrals.emptyAction);
  });
});

describe("D64: a running month draws what it drew before", () => {
  beforeEach(() => {
    state.read = { state: "ready", snapshot: RUNNING };
  });

  it("offers the invite card, the campaign and the per-referral reward, and says no pause", async () => {
    const markup = await PAGES.rewards();
    for (const id of ["rewards-invite", "rewards-invite-copy", "rewards-invite-share", "rewards-invite-qr-toggle", "rewards-campaign", "rewards-policy-reward"]) {
      expect(markup, id).toContain(`data-testid="${id}"`);
    }
    expect(markup).toContain("/join/K7M2QX");
    expect(markup).not.toContain('data-testid="rewards-paused"');
    for (const name of ["referrals", "history", "withdraw", "how"] as const) {
      expect(await PAGES[name](), name).not.toContain(r.pause.title);
    }
  });

  it("keeps the invite hub's ticket and its first run", async () => {
    const hub = await PAGES.hub();
    expect(hub).toContain('data-testid="invite-ticket"');
    /* Running, the hub says what is earned, never "no reward" (R2, round 4). */
    expect(hub).toContain('data-testid="invite-rewards-running"');
    expect(hub).not.toContain(door.noReward);
    expect(hub).not.toContain(r.pause.title);
    expect(state.gate).toEqual(["invite"]);
  });
});

describe("D64: before the read exists", () => {
  it("draws the not-live state and the hub as today", async () => {
    state.read = { state: "not-live" };
    expect(await PAGES.rewards()).toContain('data-testid="rewards-not-live"');
    const hub = await PAGES.hub();
    expect(hub).toContain('data-testid="invite-ticket"');
    expect(hub).not.toContain(r.pause.title);
  });
});
