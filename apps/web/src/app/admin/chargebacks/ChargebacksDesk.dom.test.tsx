/**
 * The chargebacks desk, one case and the lister's hold notice, rendered from
 * the preview fixtures pinned to Tuesday 13 October 2026.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { DESK, LOST_DETAIL, NOW, OPEN_DETAIL, ROWS } from "@/app/(dev)/preview/chargebacks/fixtures";
import { readChargebackQuery } from "@/lib/admin/reads/chargebacks-model";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh() {}, push() {} }), usePathname: () => "/admin/chargebacks" }));
vi.mock("@/lib/admin/chargeback-actions", () => ({ moveChargeback: vi.fn(), openChargeback: vi.fn(), addChargebackNote: vi.fn() }));

const { ChargebacksDesk } = await import("./ChargebacksDesk");
const { ChargebackCase } = await import("./ChargebackCase");
const { ChargebackHoldNotice } = await import("@/components/money/ChargebackHoldNotice");
const t = getDictionary("en");
const copy = t.chargebacks.desk;
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/\s+/g, " ");

const desk = (params: Record<string, string> = {}, read: Parameters<typeof ChargebacksDesk>[0]["read"] = { state: "ok", data: DESK }) =>
  renderToStaticMarkup(<ChargebacksDesk query={readChargebackQuery(params)} read={read} page={1} now={NOW} copy={copy} locale="en" />);

describe("the desk", () => {
  it("counts every state at the top, each a link that narrows", () => {
    const html = desk();
    expect(html).toContain('data-testid="chargeback-count-all"');
    expect(html).toMatch(/chargeback-count-owed[^>]*>.*?nf-cb-count__value[^>]*>1</);
    expect(html).toContain('href="/admin/chargebacks?state=lost"');
    expect((html.match(/data-testid="chargeback-row"/g) ?? []).length).toBe(ROWS.length);
  });

  it("narrows by the filters and says when nothing matches", () => {
    expect((desk({ state: "won" }).match(/data-testid="chargeback-row"/g) ?? []).length).toBe(1);
    const none = text(desk({ min: "99999999" }));
    expect(none).toContain(copy.noMatchTitle);
    expect(none).toContain(copy.showEvery);
  });

  it("flags the overdue deadline and the charge with no lister", () => {
    const html = text(desk());
    expect(html).toContain("Overdue since");
    expect(html).toContain(copy.unattributed);
  });

  it("draws the empty desk and the failed read calmly", () => {
    expect(text(desk({}, { state: "ok", data: { rows: [], counts: { ...DESK.counts, all: 0 } } }))).toContain(copy.emptyTitle);
    expect(text(desk({}, { state: "unavailable" }))).toContain(copy.unavailableTitle);
  });
});

describe("one case", () => {
  it("shows the amount, the parties, the timeline with notes and the moves a lost, owed case allows", () => {
    const html = renderToStaticMarkup(<ChargebackCase detail={LOST_DETAIL} now={NOW} copy={copy} locale="en" />);
    const words = text(html);
    expect(html).toContain('data-testid="chargeback-amount"');
    expect(words).toContain("Ada Okafor");
    expect(html).toContain(`/admin/bookings/${LOST_DETAIL.row.bookingId}`);
    expect(words).toContain("Uploaded the photos, the thread and the receipt");
    expect(html).toContain('data-move="record_recovery"');
    expect(html).toContain('data-move="write_off"');
    expect(html).not.toContain('data-move="reverse_to_won"');
    expect(html).toContain('data-testid="chargeback-hold-note"');
    expect(html).toContain('data-testid="chargeback-note-form"');
  });

  it("says when the timeline is the audit log's and notes are not open yet", () => {
    const html = renderToStaticMarkup(<ChargebackCase detail={OPEN_DETAIL} now={NOW} copy={copy} locale="en" />);
    expect(text(html)).toContain(copy.detail.timelineFallback);
    expect(html).toContain('data-testid="chargeback-notes-pending"');
    expect(html).toContain('data-move="request_evidence"');
  });
});

describe("the lister's hold notice", () => {
  const hold = t.chargebacks.hold;
  it("draws nothing without a hold", () => {
    expect(renderToStaticMarkup(<ChargebackHoldNotice hold={{ state: "none" }} copy={hold} locale="en" />)).toBe("");
  });
  it("says what it means and what happens next, with the amount when known", () => {
    const html = renderToStaticMarkup(
      <ChargebackHoldNotice hold={{ state: "held", owedMinor: 2_250_000, currency: "NGN", count: 1, since: null, openCount: 0 }} copy={hold} locale="en" />,
    );
    expect(html).toContain('id="chargeback"');
    expect(html).toContain('data-testid="chargeback-hold-amount"');
    expect(text(html)).toContain("22,500");
    expect(text(html)).toContain(hold.meansTitle);
    expect(text(html)).toContain(hold.nextTitle);
    const plain = text(renderToStaticMarkup(<ChargebackHoldNotice hold={{ state: "held", owedMinor: null, currency: "NGN", count: null, since: null, openCount: 0 }} copy={hold} locale="en" />));
    expect(plain).toContain(hold.bodyNoAmount);
  });
  it("draws an undecided dispute in the calmer tone", () => {
    const html = renderToStaticMarkup(<ChargebackHoldNotice hold={{ state: "open", openCount: 2 }} copy={hold} locale="en" />);
    expect(html).toContain('data-testid="chargeback-open-notice"');
    expect(text(html)).toContain("Disputes open: 2");
  });
});
