import { formatDate, formatMoney, type Locale } from "@vallo/i18n";
import type { EvidenceItem } from "@/lib/admin/reads/escrow";
import type { AdminUi } from "../../_components/ui";
import { CalmNote, Waiting } from "./Desk";

/**
 * EVERYTHING FILED ON A DISPUTE, ON THE RULING ITSELF, so nobody rules without
 * reading it. Read by `getDisputeEvidence` (`lib/admin/reads/escrow.ts`).
 *
 * A row is a file or one of thirteen closed facts, never an opinion; the table
 * is append only. Which side filed it is said in words, from the escrow's own
 * payer and payee. A file opens through a ten-minute signed link into the
 * private `escrow-evidence` bucket, in the browser's own viewer (there is no
 * in-console document viewer to reuse). A read that failed is said as a
 * failure and never drawn as "nothing filed".
 */

/** The thirteen facts, in an operator's words. */
const FACT_LINE: Record<string, string> = {
  viewing_attended: "The viewing happened",
  viewing_missed: "The viewing did not happen",
  keys_received: "The keys were handed over",
  keys_not_received: "The keys were not handed over",
  agreement_signed: "An agreement was signed",
  agreement_not_signed: "No agreement was signed",
  service_delivered: "The work was done",
  service_not_delivered: "The work was not done",
  property_matched_listing: "The property matched the listing",
  property_differed_from_listing: "The property was not what the listing said",
  contacted_on: "Got in touch with the other side",
  no_reply_since: "No reply from the other side since",
  amount_agreed: "The amount agreed",
};

function size(bytes: number | null): string | null {
  if (bytes === null) return null;
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function kindWord(mime: string | null): string {
  if (!mime) return "File";
  if (mime === "application/pdf") return "PDF";
  if (mime.startsWith("image/")) return "Image";
  return "File";
}

function factLine(item: EvidenceItem, locale: Locale): string {
  const line = FACT_LINE[item.fact ?? ""] ?? "A fact";
  if (item.happenedOn) {
    return `${line} on ${formatDate(new Date(`${item.happenedOn}T12:00:00Z`), locale, { day: "numeric", month: "short", year: "numeric" })}`;
  }
  if (item.amountMinor !== null) return `${line}: ${formatMoney(item.amountMinor, locale)}`;
  return line;
}

export function DisputeEvidence({
  items,
  readable,
  payerName,
  payeeName,
  locale,
  ui,
}: {
  /** Undefined or empty when nothing is filed. */
  items: readonly EvidenceItem[] | undefined;
  /** False when the evidence read failed. */
  readable: boolean;
  payerName: string | null;
  payeeName: string | null;
  locale: Locale;
  ui: AdminUi;
}) {
  const who = (item: EvidenceItem) =>
    item.side === "payer"
      ? `Payer · ${payerName ?? item.authorName ?? "no display name"}`
      : item.side === "payee"
        ? `Payee · ${payeeName ?? item.authorName ?? "no display name"}`
        : `Neither party · ${item.authorName ?? "no display name"}`;

  return (
    <section className="nf-md-evidence" aria-label="Evidence filed on this dispute">
      <h4 className="nf-md-evidence__title">
        Evidence filed{readable && items && items.length > 0 ? ` (${items.length})` : ""}
      </h4>
      {!readable ? (
        <Waiting
          title="The evidence could not be read"
          body="What each side has filed on this dispute. The read did not answer just now, which is not the same as nothing being filed. Reload before ruling."
        />
      ) : !items || items.length === 0 ? (
        <CalmNote
          title="Nothing has been filed on this dispute"
          fills="Every receipt, photograph, message screenshot and dated fact either side files, with who filed it and when."
          creates="Each side files from their own held payment page. Items appear here as they are filed and cannot be edited or removed."
        />
      ) : (
        <ol className="nf-md-evidence__list">
          {items.map((item) => (
            <li key={item.id} className="nf-md-evidence__item" data-side={item.side}>
              <span className="nf-md-evidence__who">{who(item)}</span>
              <span className="nf-md-evidence__what">
                {item.kind === "fact" ? (
                  factLine(item, locale)
                ) : (
                  <>
                    <span className="block">
                      {item.fileName ?? "A file"}
                      {item.caption ? `: ${item.caption}` : ""}
                    </span>
                    <span className="nf-md-evidence__meta">
                      {[kindWord(item.mimeType), size(item.sizeBytes)].filter(Boolean).join(" · ")}
                      {" · "}
                      {item.fileUrl ? (
                        <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" className="nf-md-evidence__open">
                          Open file
                        </a>
                      ) : (
                        "Could not be opened just now"
                      )}
                    </span>
                  </>
                )}
              </span>
              <span className="nf-md-evidence__when">{ui.when(item.createdAt)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
