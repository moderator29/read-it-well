import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { adminUi } from "@/app/admin/_components/ui";
import { QueueFilters, QueuePager } from "@/app/admin/_components/QueueFilters";

/**
 * THE CONSOLE FRAME EVERY UNSHOT DESK INHERITS, in one page.
 *
 * `listings`, `agents`, `kyc`, `moderation`, `reports`, `support`, `social`,
 * `standing`, `stops`, `switches`, `flags`, `fees`, `escrow`, `examples` and
 * `reference` all draw their page out of these pieces: the headline with its
 * count, the glass search and its date disclosure, the status chips, the three
 * empty states, the read failure, the alarm, the metric tiles in all four
 * tones, the detail rows, the admission checklist and the pager. Shooting them
 * together is how a register fault in the frame is found once rather than
 * fifteen times.
 *
 * The real desks gate on `requireAdmin` in the layout, so the pieces are
 * rendered here directly, exactly as a desk calls them.
 */
export const dynamic = "force-dynamic";

export default async function PreviewAdminFrame() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const ui = adminUi(t, locale);
  const common = t.admin.common;

  return (
    <div className="nf-admin">
      {/* The route's own wrapper: `.nf-admin` is a flex row beside the rail, and
          this is the min-width-0 column that lets the body shrink to a phone. */}
      <main className="nf-admin-body min-w-0 flex-1">
        <div className="nf-console">
          <ui.QueueHeader
            title="Listings"
            lede="Everything submitted for review, newest first, with the reviewer's own words on any row that was sent back."
            count={18}
          />

          <QueueFilters
            base="/preview/f5/admin-frame"
            query={{}}
            common={common}
            statuses={[
              { value: "PENDING", label: "Pending" },
              { value: "UNDER_REVIEW", label: "In review" },
              { value: "APPROVED", label: "Approved" },
              { value: "REJECTED", label: "Rejected" },
            ]}
          />

          <ui.StatRow>
            <ui.Stat label="Waiting" value="18" hint="Nothing has been decided on these." />
            <ui.Stat label="Oldest wait" value="4 days" tone="warning" hint="The one at the bottom." />
            <ui.Stat label="Short by" value="₦4,000.00" tone="danger" hint="The ledger does not balance." />
            <ui.Stat label="Cleared today" value="9" tone="success" />
          </ui.StatRow>

          <ui.Section title="An empty queue, three ways" hint="Cleared, never used, and a filter that matched nothing.">
            <div className="nf-queue-list">
              <ui.QueueEmpty title="All clear" body="Everything that arrived here has been dealt with." state="cleared" />
              <ui.QueueEmpty
                title="Nothing has arrived here"
                body="When somebody submits a listing for review it lands here with the reviewer's checklist beside it."
                state="never"
              />
              <ui.QueueEmpty title={common.noMatchTitle} body={common.noMatchBody} state="no-match" />
            </div>
          </ui.Section>

          <ui.Section title="When a read fails, and when the finding is real">
            <div className="nf-queue-list">
              <ui.QueueUnavailable />
              <ui.QueueAlarm
                title="The ledger is short"
                body="Settled charges do not add up to what the escrow holds. Nothing has moved; somebody needs to look at this today."
              />
            </div>
          </ui.Section>

          <ui.Section title="One row's detail">
            <div className="nf-card p-card">
              <ui.DetailSection title="The submission">
                <ui.DetailRow label="Reference" value="LST-1024" />
                <ui.DetailRow label="Submitted" value={ui.when("2026-06-18T09:24:00.000Z")} />
                <ui.DetailRow label="Check in" value={ui.day("2026-07-02")} />
                <ui.DetailRow label="Registered name" value={null} />
                <ui.DetailRow
                  label="What the reviewer wrote"
                  value="The title document is cut off at the bottom of the page, so the registry number cannot be read. Send the whole page."
                />
              </ui.DetailSection>
              <ui.DetailSection title="Admission checks">
                <ul className="m-0 list-none p-0">
                  <ui.CheckRow label="Identity" pass detail="A driver's licence, read and matched to the account name." />
                  <ui.CheckRow
                    label="Registered name"
                    pass={false}
                    detail="The CAC certificate is a photograph of a screen, so the registration number cannot be read."
                  />
                </ul>
              </ui.DetailSection>
            </div>
          </ui.Section>

          <QueuePager base="/preview/f5/admin-frame" query={{}} pageSize={20} full count={20} />
        </div>
      </main>
    </div>
  );
}
