/**
 * The referral desk, rendered for real from fixtures pinned to Tuesday
 * 13 October 2026: the top row (rewards owed, budget used against the cap,
 * referrals by outcome), the live campaign and its terms, the three sections,
 * the two honest states every section can be in (clear, unreadable), the
 * graph, the wording of money, and axe in Chromium.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it, vi } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { axe, closeAxe, hasBrowser } from "@/lib/a11y/axe";
import {
  DESK,
  EDGES,
  GRAPH,
  GROUPS,
  ID,
  NOW,
  PAYOUTS_IN_FLIGHT,
  PAYOUTS_WAITING,
  REVIEW_ITEMS,
} from "@/app/(dev)/preview/referral-desk/fixtures";
import { readReferralQuery } from "@/lib/admin/reads/referrals-model";
import type { ReferralTabData } from "./ReferralDesk";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh() {}, push() {} }), usePathname: () => "/admin/referrals" }));
vi.mock("@/lib/admin/referral-actions", () => ({
  setReferralBudget: vi.fn(),
  decideReferral: vi.fn(),
  decidePayout: vi.fn(),
}));

const { ReferralDesk } = await import("./ReferralDesk");
const copy = getDictionary("en").referralDesk;

afterAll(closeAxe);

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

const OK_TABS: Record<string, ReferralTabData> = {
  review: { review: { state: "ok", data: { items: REVIEW_ITEMS, total: REVIEW_ITEMS.length } } },
  fraud: {
    fraud: { state: "ok", data: { groups: GROUPS } },
    graph: { member: ID(1), usingDefault: true, read: { state: "ok", data: GRAPH } },
  },
  payouts: { payouts: { state: "ok", data: { waiting: PAYOUTS_WAITING, inFlight: PAYOUTS_IN_FLIGHT } } },
};

function render(
  params: Record<string, string> = {},
  over: { desk?: Parameters<typeof ReferralDesk>[0]["desk"]; tab?: ReferralTabData } = {},
) {
  const query = readReferralQuery(params);
  return renderToStaticMarkup(
    <ReferralDesk
      query={query}
      locale="en"
      copy={copy}
      desk={over.desk ?? { state: "ok", data: DESK }}
      tab={over.tab ?? OK_TABS[query.tab]!}
      now={NOW}
    />,
  );
}

describe("the top row", () => {
  it("leads with what Vallo owes in rewards, in naira, and says it is a debt not money held", () => {
    const html = render();
    const owed = text(html.slice(html.indexOf('data-testid="top-owed"'), html.indexOf('data-testid="top-budget"')));
    expect(owed).toContain("₦18,400");
    expect(owed).toContain("It is a debt of Vallo's, not money held for anyone");
    expect(owed).toContain("₦24,000 more is pending");
    expect(owed).toContain("₦6,960 paid out so far");
    expect(owed).toContain("₦80 reversed after it was paid");
  });

  it("shows the budget used against the cap, with the share, and the control to change it", () => {
    const html = render();
    const budget = html.slice(html.indexOf('data-testid="top-budget"'), html.indexOf('data-testid="top-counts"'));
    expect(text(budget)).toContain("₦412,000");
    expect(text(budget)).toContain("of ₦700,000");
    expect(text(budget)).toContain("59% of October 2026");
    expect(budget).toContain('role="progressbar"');
    expect(budget).toContain('aria-valuenow="59"');
    expect(budget).toContain('data-testid="budget-open"');
    expect(text(budget)).toContain(copy.budget.openEdit);
  });

  it("says plainly when the month has no budget row, and offers to set one", () => {
    const desk = {
      state: "ok" as const,
      data: { ...DESK, budgets: [], liability: { ...DESK.liability, budgetCapMinor: null, budgetCommittedMinor: null } },
    };
    const html = render({}, { desk });
    expect(text(html)).toContain("No budget row for October 2026 yet");
    expect(html).toContain('data-testid="budget-open"');
    expect(text(html)).toContain(copy.budget.openSet);
  });

  it("warns when more is committed than the cap allows", () => {
    const desk = { state: "ok" as const, data: { ...DESK, liability: { ...DESK.liability, budgetCommittedMinor: 71_000_000 } } };
    const html = render({}, { desk });
    expect(text(html)).toContain(copy.top.budgetOver);
    expect(html).toContain("data-over");
  });

  it("counts referrals as qualified, pending and reversed, and what waits on a person", () => {
    const html = render();
    expect(html).toMatch(/data-testid="count-qualified">137</);
    expect(html).toMatch(/data-testid="count-pending">42</);
    expect(html).toMatch(/data-testid="count-reversed">13</);
    expect(text(html)).toContain("5 waiting on a decision");
    expect(text(html)).toContain("14 waiting for their phone number");
  });

  it("says the programme is open, or paused and why", () => {
    expect(text(render())).toContain(copy.programme.open);
    const paused = { state: "ok" as const, data: { ...DESK, programme: { open: false, reason: "budget_reached" } } };
    expect(text(render({}, { desk: paused }))).toContain(copy.programme.pausedBudgetReached);
    const noCampaign = { state: "ok" as const, data: { ...DESK, live: null, programme: { open: false, reason: "no_campaign" } } };
    expect(text(render({}, { desk: noCampaign }))).toContain(copy.programme.pausedNoCampaign);
  });

  it("badges the two queues on their tabs", () => {
    const html = render();
    const tabs = text(html.slice(html.indexOf(`aria-label="${copy.tabs.label}"`)));
    expect(tabs).toMatch(/Review queue 3/);
    expect(tabs).toMatch(/Payouts 2/);
  });
});

describe("the live campaign", () => {
  it("shows signup-80-phone with its reward, cap, review period and what an invited person must do", () => {
    const html = render();
    const live = text(html.slice(html.indexOf('data-testid="live-campaign"'), html.indexOf('data-testid="other-campaigns"')));
    expect(live).toContain("Invite and Earn (signup-80-phone)");
    expect(live).toContain("₦80");
    expect(live).toContain("₦120,000");
    expect(live).toContain("up to 1,500 invited people");
    expect(live).toContain("7 days");
    expect(live).toContain("They confirm their phone number");
    expect(live).toContain("They accept the terms and set their first name");
    expect(live).not.toContain("email address");
    expect(live).toContain("Live since 13 Oct 2026");
    expect(live).toContain("Founder ruling 13 October 2026");
  });

  it("lists the ended signup-80 and the drafts as history, not as live", () => {
    const html = render();
    const others = text(html.slice(html.indexOf('data-testid="other-campaigns"')));
    expect(others).toContain("signup-80)");
    expect(others).toContain("ended 13 Oct 2026");
    expect(others).toContain("business-proposed");
    expect(others).toContain(copy.campaign.statusDraft);
  });

  it("says no campaign is live, and what that means for new invites", () => {
    const html = render({}, { desk: { state: "ok", data: { ...DESK, live: null } } });
    expect(text(html)).toContain(copy.campaign.none);
    expect(text(html)).toContain("Rewards already earned stay owed");
    expect(html).not.toContain('data-testid="live-campaign"');
  });
});

describe("the review queue", () => {
  it("lists each referral with who invited whom, the reward, the signals in words, and the group", () => {
    const html = render();
    const items = html.split('data-testid="review-item"').slice(1);
    expect(items).toHaveLength(3);
    const first = text(items[0]!);
    expect(first).toContain("Ngozi Eze invited Amina Bello");
    expect(first).toContain("₦80");
    expect(first).toContain("Risk 65");
    expect(first).toContain("The accounts share one payout bank account");
    expect(first).toContain("cluster flagged for review");
    expect(first).toContain("₦640 at stake");
    expect(first).toContain("8 people");
    expect(html).toContain(`href="/admin/people/${ID(1)}"`);
    expect(html).toContain(`href="/admin/referrals?tab=fraud&amp;member=${ID(1)}#referral-graph-panel"`);
    /* No raw reason code, no machine key. */
    expect(first).not.toContain("shared_payout_destination");
  });

  it("names a member with no display name by the start of their id, and says when no reward is set", () => {
    const html = render();
    const third = text(html.split('data-testid="review-item"')[3]!);
    expect(third).toContain("Member 0000 invited Funke Alabi");
    expect(third).toContain(copy.review.noReward);
    expect(third).toContain(copy.review.noSignals);
  });

  it("puts an approve and a reject on every item", () => {
    const html = render();
    expect((html.match(/data-testid="referral-approve"/g) ?? []).length).toBe(3);
    expect((html.match(/data-testid="referral-reject"/g) ?? []).length).toBe(3);
  });

  it("says nothing is waiting, or that the queue could not be read, and never draws the second as the first", () => {
    const clear = render({}, { tab: { review: { state: "ok", data: { items: [], total: 0 } } } });
    expect(text(clear)).toContain(copy.review.emptyTitle);
    expect(clear).not.toContain('data-testid="review-list"');
    const down = render({}, { tab: { review: { state: "unavailable" } } });
    expect(text(down)).toContain("could not be read just now");
    expect(text(down)).not.toContain(copy.review.emptyTitle);
  });

  it("says when only the oldest are shown", () => {
    const html = render({}, { tab: { review: { state: "ok", data: { items: REVIEW_ITEMS, total: 140 } } } });
    expect(text(html)).toContain("Showing the oldest 3 of 140");
  });
});

describe("the fraud view", () => {
  it("ranks groups by what is at stake, with the shared signals masked", () => {
    const html = render({ tab: "fraud" });
    const list = html.slice(html.indexOf('data-testid="cluster-list"'), html.indexOf('id="referral-graph-panel"'));
    const items = list.split('data-testid="cluster-item"').slice(1);
    expect(items).toHaveLength(3);
    expect(text(items[0]!)).toContain("Ngozi Eze");
    expect(text(items[0]!)).toContain("₦640");
    expect(text(items[0]!)).toContain("5 share a browser (ab12)");
    expect(text(items[0]!)).toContain("4 share a network (102.89.x.x)");
    expect(text(items[2]!)).toContain(copy.fraud.weak);
    expect(html).not.toContain("102.89.23.14");
    expect(html).not.toContain("ab12cd34ef56");
  });

  it("says no group stands out, or that the view could not be read", () => {
    const clear = render({ tab: "fraud" }, { tab: { fraud: { state: "ok", data: { groups: [] } }, graph: { member: null, usingDefault: false, read: null } } });
    expect(text(clear)).toContain(copy.fraud.emptyTitle);
    expect(text(clear)).toContain(copy.graph.empty);
    const down = render({ tab: "fraud" }, { tab: { fraud: { state: "unavailable" }, graph: { member: null, usingDefault: false, read: null } } });
    expect(text(down)).toContain("could not be read just now");
    expect(text(down)).not.toContain(copy.fraud.emptyTitle);
  });

  it("draws who invited whom as a diagram, with the member in focus and the loop line, and lists every invitation", () => {
    const html = render({ tab: "fraud", member: ID(1) });
    const graph = html.slice(html.indexOf('data-testid="referral-graph"'));
    expect((graph.match(/data-testid="graph-node"/g) ?? []).length).toBe(7);
    expect(graph).toContain("nf-rgraph__node--focus");
    expect(graph).toContain("nf-rgraph__link--back");
    expect(graph).toContain('role="img"');
    expect(text(graph)).toContain("Ngozi Eze");
    expect(text(graph)).toContain("Reversed, risk 40");
    expect(text(graph)).toContain(copy.graph.loop);
    const rows = graph.slice(graph.indexOf("<tbody>"), graph.indexOf("</tbody>")).split("<tr").length - 1;
    expect(rows).toBe(EDGES.length);
    expect(text(graph)).toContain(copy.graph.listTitle);
  });

  it("is keyboard reachable on a phone: the scrolling picture is a focusable region with a name", () => {
    const html = render({ tab: "fraud", member: ID(1) });
    expect(html).toMatch(/class="nf-rgraph-wrap" role="region" tabindex="0" aria-label="[^"]+"/);
  });

  it("says a member with no invitations has none, and offers their file", () => {
    const html = render(
      { tab: "fraud", member: ID(3) },
      { tab: { fraud: { state: "ok", data: { groups: [] } }, graph: { member: ID(3), usingDefault: false, read: { state: "ok", data: { edges: [], names: {} } } } } },
    );
    expect(text(html)).toContain(copy.graph.noEdges);
    expect(html).toContain(`href="/admin/people/${ID(3)}"`);
  });

  it("says when the graph could not be read", () => {
    const html = render(
      { tab: "fraud", member: ID(3) },
      { tab: { fraud: { state: "ok", data: { groups: [] } }, graph: { member: ID(3), usingDefault: false, read: { state: "unavailable" } } } },
    );
    expect(text(html)).toContain("could not be read just now");
  });
});

describe("payouts", () => {
  it("says how rewards are paid: by Paystack, from Vallo's own funds, never held, paid only on confirmation", () => {
    const html = render({ tab: "payouts" });
    const how = text(html.slice(html.indexOf('data-testid="payout-how"'), html.indexOf('data-testid="payout-how"') + 600));
    expect(how).toContain("Paystack, the payout partner");
    expect(how).toContain("Vallo's own funds");
    expect(how).toContain("Vallo does not hold a member's money");
    expect(how).toContain("only when Paystack confirms it");
  });

  it("lists waiting payouts with the amount, the account name and last four, the signals, and release or refuse", () => {
    const html = render({ tab: "payouts" });
    const items = html.split('data-testid="payout-item"').slice(1);
    expect(items).toHaveLength(2);
    const first = text(items[0]!);
    expect(first).toContain("₦6,400");
    expect(first).toContain("To NGOZI A EZE, account ending 4417");
    expect(first).toContain("The accounts share one payout bank account");
    expect(first).toContain("Risk 60");
    expect(first).toContain(copy.payouts.holdNote);
    expect((html.match(/data-testid="payout-release"/g) ?? []).length).toBe(2);
    expect((html.match(/data-testid="payout-refuse"/g) ?? []).length).toBe(2);
    /* The full account number and the provider's secrets are never on the page. */
    expect(html).not.toMatch(/\b\d{10}\b/);
  });

  it("disables release for a payout with no recipient, and says why", () => {
    const html = render({ tab: "payouts" });
    const second = html.split('data-testid="payout-item"')[2]!;
    expect(second).toMatch(/<button[^>]*disabled=""[^>]*data-testid="payout-release"|<button[^>]*data-testid="payout-release"[^>]*disabled=""/);
    expect(text(second)).toContain(copy.payouts.noRecipient);
  });

  it("shows what is with the payout partner, offers never sent only once it has been open a day, and never calls an unknown failed", () => {
    const html = render({ tab: "payouts" });
    const flight = html.slice(html.indexOf('data-testid="inflight-list"'));
    const items = flight.split('data-testid="inflight-item"').slice(1);
    expect(items).toHaveLength(2);
    expect(text(items[0]!)).toContain(copy.payouts.stateSent);
    expect(items[0]).not.toContain("payout-never-sent");
    expect(text(items[1]!)).toContain(copy.payouts.stateUnknown);
    expect(text(items[1]!)).toContain("never as failed");
    expect(text(items[1]!)).toContain(copy.payouts.stuck);
    expect(items[1]).toContain('data-testid="payout-never-sent"');
  });

  it("says when withdrawals are switched off", () => {
    const desk = { state: "ok" as const, data: { ...DESK, liability: { ...DESK.liability, payoutsEnabled: false } } };
    const html = render({ tab: "payouts" }, { desk });
    expect(html).toContain('data-testid="payouts-off"');
    expect(text(html)).toContain("Withdrawals are switched off in the referral policy");
  });

  it("says nothing is waiting, or that the queue could not be read", () => {
    const clear = render({ tab: "payouts" }, { tab: { payouts: { state: "ok", data: { waiting: [], inFlight: [] } } } });
    expect(text(clear)).toContain(copy.payouts.emptyTitle);
    expect(text(clear)).toContain(copy.payouts.inFlightEmpty);
    const down = render({ tab: "payouts" }, { tab: { payouts: { state: "unavailable" } } });
    expect(text(down)).toContain("could not be read just now");
    expect(text(down)).not.toContain(copy.payouts.emptyTitle);
  });
});

describe("when the desk cannot be read", () => {
  it("draws the unreadable state, not zeroes", () => {
    const html = render({}, { desk: { state: "unavailable" }, tab: { review: { state: "unavailable" } } });
    expect(text(html)).toContain("could not be read just now");
    expect(html).not.toContain('data-testid="top-owed"');
    expect(html).not.toContain("₦0");
  });
});

describe("the words", () => {
  it("uses no em dash and none of the words that promise", () => {
    const strings: string[] = [];
    const walk = (value: unknown) => {
      if (typeof value === "string") strings.push(value);
      else if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === "object") Object.values(value).forEach(walk);
    };
    walk(copy);
    for (const s of strings) {
      expect(s).not.toMatch(/—|–/);
      expect(s).not.toMatch(/\b(verified|guaranteed?|secure|securely|safe|safely|encrypted|checked|protected|insured|instant|instantly)\b/i);
    }
  });

  it("never says Vallo holds, keeps or banks a member's money", () => {
    const all = text(render()) + text(render({ tab: "payouts" }));
    expect(all).not.toMatch(/\bwallet\b|\bescrow\b|Vallo holds|Vallo keeps|held for you/i);
  });
});

describe("accessibility", () => {
  it.skipIf(!hasBrowser && !process.env.CI)("has no axe violations on any section", async () => {
    expect(await axe(render())).toEqual([]);
    expect(await axe(render({ tab: "fraud", member: ID(1) }))).toEqual([]);
    expect(await axe(render({ tab: "payouts" }))).toEqual([]);
    expect(await axe(render({}, { desk: { state: "unavailable" }, tab: { review: { state: "unavailable" } } }))).toEqual([]);
  });
});
