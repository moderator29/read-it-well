/**
 * THE INVITE HUB, HOW INVITES WORK AND THE INVITE'S FIRST RUN, IN EACH STATE OF
 * THE REWARDS READ (the founder, 6 October: write it for the live state now,
 * behind the gate that already decides the rewards surface).
 *
 * The gate is the rewards read (`inviteRewards`); there is no rewards key in
 * `feature_flags`. Each surface is rendered for real (its page function, the
 * request-bound modules stubbed) in four reads, and the markup is scanned:
 *
 *   not-live  "There is no reward for inviting" and "Nothing to earn", and no
 *             reward words at all
 *   running   the invite, what the invited person gets, the reward and the
 *             monthly count from the read's policy, Pending then Available,
 *             the monthly budget, the Rewards Balance; and no "no reward"
 *   paused    the pause notice, no invite, no reward words, no "no reward",
 *             and no first run (R1's build, unchanged)
 *   failed    the invite, and nothing about a reward either way
 *
 * In EVERY state the hub links its referrals list and the Rewards page (the
 * founder could not find either, 7 October 2026). The Rewards row is a door,
 * not a reward word: it is titled "Rewards" and its line says what the page
 * will say (not running yet, paused, or nothing on a failed read); only a
 * running programme turns it into the Rewards Balance row.
 *
 * The snapshot is the rewards deck's fixture (`(dev)/preview/rewards`), with
 * the policy changed once to show the figures follow the read.
 */
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDictionary } from "@vallo/i18n";
import {
  REWARDS_MONTHLY_BUDGET,
  REWARDS_NOT_HELD,
  REWARDS_PENDING_THEN_AVAILABLE,
  REWARDS_QUALIFY,
} from "@/lib/money/copy";
import { REWARDS_PAUSED_EARNED_LINE } from "@/components/app/referral/money-words";
import { FIXTURE_PAUSED_SNAPSHOT, FIXTURE_SNAPSHOT } from "@/app/(dev)/preview/rewards/fixtures";
import { inviteRewards, type RewardsRead, type RewardsSnapshot } from "@/lib/referral/rewards";
import { firstRunContent } from "@/components/app/feature-onboarding/first-runs";

const state = vi.hoisted(() => ({
  read: { state: "not-live" } as RewardsRead,
  gate: [] as string[],
  redirected: null as string | null,
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
  withdrawActions: null,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not-found");
  },
  redirect: (to: string) => {
    state.redirected = to;
    throw new Error("redirected");
  },
}));
/* The panels as plain markup: what the route hands the client component. */
vi.mock("@/components/app/feature-onboarding/FirstRunPanels", () => ({
  FirstRunPanels: ({ panels, action }: { panels: { title: string; body: string }[]; action: string }) => (
    <div data-testid="first-run">
      {panels.map((panel) => (
        <section key={panel.title}>
          <h2>{panel.title}</h2>
          <p>{panel.body}</p>
        </section>
      ))}
      <a>{action}</a>
    </div>
  ),
}));

const t = getDictionary("en");
const r = t.experienceRewards;
const door = t.publicDoors.invite;
const runC = t.experienceFeatures.firstRun.invite;

const RUNNING: RewardsSnapshot = { ...FIXTURE_SNAPSHOT, programme: { state: "running" } };
const PAUSED: RewardsSnapshot = FIXTURE_PAUSED_SNAPSHOT;

/* The "no reward" wording, which belongs to not-live alone. */
const NO_REWARD = [door.noReward, runC.p2Title];

/* Every word that speaks of a reward being earned. Not one may show unless the programme runs. */
const REWARD_WORDS = [
  r.inviteHub.label,
  r.inviteHub.theyGetTitle,
  r.inviteHub.earnTitle,
  r.inviteHub.pendingTitle,
  r.inviteHub.budgetTitle,
  r.inviteHub.balanceRow,
  runC.running.p1Title,
  runC.running.p2Title,
  runC.running.p3Title,
  REWARDS_QUALIFY.split("{reward}")[0]!,
  REWARDS_PENDING_THEN_AVAILABLE,
  REWARDS_MONTHLY_BUDGET,
  REWARDS_NOT_HELD,
];

/* The two inner-page doors every state of the hub draws. */
const REFERRALS_DOOR = 'href="/settings/invite/referrals"';
const REWARDS_DOOR = 'href="/rewards"';

function html(element: ReactElement): string {
  return renderToStaticMarkup(element)
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

async function page(load: () => Promise<{ default: unknown }>, props: object = {}) {
  const Page = (await load()).default as (p: object) => Promise<ReactElement>;
  return html(await Page(props));
}

const PAGES = {
  hub: () => page(() => import("./page"), { searchParams: Promise.resolve({}) }),
  how: () => page(() => import("./how-it-works/page")),
  run: () =>
    page(() => import("../../../first-run/[feature]/page"), {
      params: Promise.resolve({ feature: "invite" }),
      searchParams: Promise.resolve({}),
    }),
};

function none(markup: string, words: readonly string[], where: string) {
  for (const words_ of words) expect(markup, `${where}: ${words_}`).not.toContain(words_);
}

beforeEach(() => {
  state.gate = [];
  state.redirected = null;
});

describe("the gate is the rewards read, and its states never mix", () => {
  it("reads running only from a snapshot that says running with whole figures", () => {
    expect(inviteRewards({ state: "not-live" })).toEqual({ state: "not-live" });
    expect(inviteRewards({ state: "failed" })).toEqual({ state: "unknown" });
    expect(inviteRewards({ state: "signed-out" })).toEqual({ state: "unknown" });
    expect(inviteRewards({ state: "ready", snapshot: RUNNING })).toEqual({ state: "running", policy: RUNNING.policy });
    expect(inviteRewards({ state: "ready", snapshot: PAUSED }).state).toBe("paused");
    const bad = { ...RUNNING, policy: { ...RUNNING.policy, rewardPerReferralMinor: 70.5 } };
    expect(inviteRewards({ state: "ready", snapshot: bad })).toEqual({ state: "unknown" });
    const noProgramme = { ...RUNNING, programme: undefined } as unknown as RewardsSnapshot;
    expect(inviteRewards({ state: "ready", snapshot: noProgramme })).toEqual({ state: "unknown" });
  });
});

describe("not live: no reward, said plainly, and nothing reward shaped", () => {
  beforeEach(() => {
    state.read = { state: "not-live" };
  });

  it("the hub and How invites work say there is no reward", async () => {
    for (const name of ["hub", "how"] as const) {
      const markup = await PAGES[name]();
      expect(markup, name).toContain(door.noReward);
      none(markup, REWARD_WORDS, name);
      expect(markup, name).not.toContain(r.pause.title);
    }
    expect(await PAGES.hub()).toContain('data-testid="invite-ticket"');
  });

  it("the hub links who joined and the Rewards page, which says rewards are not running", async () => {
    const hub = await PAGES.hub();
    expect(hub).toContain(REFERRALS_DOOR);
    expect(hub).toContain(REWARDS_DOOR);
    expect(hub).toContain('data-testid="invite-rewards-door"');
    expect(hub).toContain(r.states.notLiveTitle);
    expect(hub).not.toContain('data-testid="invite-rewards-row"');
  });

  it("the first run is the link, then nothing to earn", async () => {
    const run = await PAGES.run();
    expect(run).toContain(runC.p1Title);
    expect(run).toContain(runC.p2Title);
    expect(run).toContain(door.noReward);
    none(run, REWARD_WORDS, "run");
  });
});

describe("running: what the invited person gets, what the member earns and when", () => {
  beforeEach(() => {
    state.read = { state: "ready", snapshot: RUNNING };
  });

  it("the hub keeps the invite and its first run, and draws the reward from the read's policy", async () => {
    const hub = await PAGES.hub();
    expect(hub).toContain('data-testid="invite-ticket"');
    expect(hub).toContain('data-testid="invite-rewards-running"');
    expect(hub).toContain(door.doorBody);
    expect(hub).toContain("Each referral that qualifies adds ₦70 to your Rewards Balance, for up to 1,500 qualified referrals a month.");
    expect(hub).toContain(REWARDS_PENDING_THEN_AVAILABLE);
    expect(hub).toContain(REWARDS_MONTHLY_BUDGET);
    expect(hub).toContain(REWARDS_DOOR);
    expect(hub).toContain('data-testid="invite-rewards-row"');
    expect(hub).toContain(r.inviteHub.balanceRow);
    expect(hub).toContain(REFERRALS_DOOR);
    none(hub, NO_REWARD, "hub");
    expect(hub).not.toContain(r.pause.title);
    expect(state.gate).toEqual(["invite"]);
  });

  it("How invites work says the same, and closes on what a Rewards Balance is", async () => {
    const how = await PAGES.how();
    for (const words of [door.doorBody, r.inviteHub.earnTitle, "adds ₦70", REWARDS_PENDING_THEN_AVAILABLE, REWARDS_MONTHLY_BUDGET, REWARDS_NOT_HELD]) {
      expect(how, words).toContain(words);
    }
    none(how, NO_REWARD, "how");
    expect(how).not.toContain(r.pause.title);
  });

  it("the first run is what they get, what you earn, then Pending and Available with the budget", async () => {
    const run = await PAGES.run();
    expect(run).toContain(runC.running.p1Title);
    expect(run).toContain(door.doorBody);
    expect(run).toContain(runC.running.p2Title);
    expect(run).toContain("adds ₦70 to your Rewards Balance, for up to 1,500");
    expect(run).toContain(`${REWARDS_PENDING_THEN_AVAILABLE} ${REWARDS_MONTHLY_BUDGET}`);
    none(run, NO_REWARD, "run");
  });

  it("takes every figure from the read, never from the page", async () => {
    state.read = {
      state: "ready",
      snapshot: { ...RUNNING, policy: { rewardPerReferralMinor: 12_300, monthlyCap: 40, withdrawMinimumMinor: 50_000 } },
    };
    for (const name of ["hub", "how", "run"] as const) {
      const markup = await PAGES[name]();
      expect(markup, name).toContain("adds ₦123 to your Rewards Balance, for up to 40 qualified referrals a month");
      expect(markup, name).not.toContain("₦70");
    }
  });

  it("never calls the Rewards Balance a wallet or money held", async () => {
    for (const name of ["hub", "how", "run"] as const) {
      const markup = (await PAGES[name]()).toLowerCase();
      expect(markup, name).not.toMatch(/\bwallet\b/);
      expect(markup, name).not.toMatch(/holds? your (money|funds)|money (we|vallo) holds?/);
    }
  });
});

describe("paused: R1's pause, unchanged, and no reward words", () => {
  beforeEach(() => {
    state.read = { state: "ready", snapshot: PAUSED };
  });

  it("the hub and How invites work say the pause and offer no invite", async () => {
    for (const name of ["hub", "how"] as const) {
      const markup = await PAGES[name]();
      expect(markup, name).toContain(r.pause.title);
      expect(markup, name).toContain(REWARDS_PAUSED_EARNED_LINE);
      none(markup, [...REWARD_WORDS, ...NO_REWARD], name);
    }
    const hub = await PAGES.hub();
    expect(hub).toContain(r.pause.inviteOff);
    expect(hub).not.toContain('data-testid="invite-ticket"');
    /* What is already earned is still the member's, so the Rewards page keeps its door. */
    expect(hub).toContain(REWARDS_DOOR);
    expect(hub).toContain('data-testid="invite-rewards-door"');
    expect(hub).toContain(REFERRALS_DOOR);
    expect(state.gate).toEqual([]);
  });

  it("there is no first run: the member is handed on to the hub", async () => {
    await expect(PAGES.run()).rejects.toThrow("redirected");
    expect(state.redirected).toBe("/settings/invite");
    expect(firstRunContent("invite", t, "en", inviteRewards(state.read)).panels).toEqual([]);
  });
});

describe("a failed read: the invite, and nothing about a reward either way", () => {
  beforeEach(() => {
    state.read = { state: "failed" };
  });

  it("neither promises a reward nor says there is none", async () => {
    for (const name of ["hub", "how", "run"] as const) {
      const markup = await PAGES[name]();
      none(markup, [...REWARD_WORDS, ...NO_REWARD], name);
      expect(markup, name).not.toContain(r.pause.title);
    }
    const hub = await PAGES.hub();
    expect(hub).toContain('data-testid="invite-ticket"');
    /* The doors stay; the Rewards row carries no line either way. */
    expect(hub).toContain(REWARDS_DOOR);
    expect(hub).toContain(REFERRALS_DOOR);
    expect(hub).not.toContain(r.states.notLiveTitle);
    expect(await PAGES.run()).toContain(runC.p1Title);
  });
});
