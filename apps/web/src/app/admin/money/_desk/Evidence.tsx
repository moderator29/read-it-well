import { formatDate, formatMoney, getDictionary, type Dictionary, type Locale } from "@vallo/i18n";
import type { EvidenceItem } from "@/lib/admin/reads/escrow";
import type { AdminUi } from "../../_components/ui";
import { CalmNote, Waiting } from "./Desk";
import { fill } from "../../_components/copy";
import { BadgeSlot } from "./BadgeSlot";
import type { BadgeTier } from "@/lib/admin/reads/badges";

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

type EvidenceWords = Dictionary["admin"]["money"]["evidence"];

function size(bytes: number | null, c: EvidenceWords): string | null {
  if (bytes === null) return null;
  if (bytes < 1024) return fill(c.sizeBytes, { size: bytes });
  if (bytes < 1024 * 1024) return fill(c.sizeKb, { size: Math.round(bytes / 1024) });
  return fill(c.sizeMb, { size: (bytes / (1024 * 1024)).toFixed(1) });
}

function kindWord(mime: string | null, c: EvidenceWords): string {
  if (!mime) return c.kindFile;
  if (mime === "application/pdf") return c.kindPdf;
  if (mime.startsWith("image/")) return c.kindImage;
  return c.kindFile;
}

/** One of the thirteen facts, in an operator's words. */
function factLine(item: EvidenceItem, locale: Locale, c: EvidenceWords): string {
  const facts: Record<string, string> = c.facts;
  const line = facts[item.fact ?? ""] ?? c.aFact;
  if (item.happenedOn) {
    return fill(c.factOn, {
      fact: line,
      date: formatDate(new Date(`${item.happenedOn}T12:00:00Z`), locale, { day: "numeric", month: "short", year: "numeric" }),
    });
  }
  if (item.amountMinor !== null) return fill(c.factAmount, { fact: line, amount: formatMoney(item.amountMinor, locale) });
  return line;
}

export function DisputeEvidence({
  items,
  readable,
  payerName,
  payeeName,
  locale,
  ui,
  tiers = {},
}: {
  /** Badge tiers keyed by user id, from `public.person_badge`. */
  tiers?: Record<string, BadgeTier>;
  /** Undefined or empty when nothing is filed. */
  items: readonly EvidenceItem[] | undefined;
  /** False when the evidence read failed. */
  readable: boolean;
  payerName: string | null;
  payeeName: string | null;
  locale: Locale;
  ui: AdminUi;
}) {
  const c = getDictionary(locale).admin.money.evidence;
  const who = (item: EvidenceItem) =>
    item.side === "payer"
      ? fill(c.payer, { name: payerName ?? item.authorName ?? c.noDisplayName })
      : item.side === "payee"
        ? fill(c.payee, { name: payeeName ?? item.authorName ?? c.noDisplayName })
        : fill(c.neither, { name: item.authorName ?? c.noDisplayName });

  return (
    <section className="nf-md-evidence" aria-label={c.label}>
      <h4 className="nf-md-evidence__title">
        {readable && items && items.length > 0 ? fill(c.titleCount, { count: items.length }) : c.title}
      </h4>
      {!readable ? (
        <Waiting
          title={c.unreadTitle}
          body={c.unreadBody}
        />
      ) : !items || items.length === 0 ? (
        <CalmNote
          title={c.noneTitle}
          fills={c.noneFills}
          creates={c.noneCreates}
        />
      ) : (
        <ol className="nf-md-evidence__list">
          {items.map((item) => (
            <li key={item.id} className="nf-md-evidence__item" data-side={item.side}>
              <span className="nf-md-evidence__who">
                {who(item)}
                {item.authorId ? <BadgeSlot tier={tiers[item.authorId]} /> : null}
              </span>
              <span className="nf-md-evidence__what">
                {item.kind === "fact" ? (
                  factLine(item, locale, c)
                ) : (
                  <>
                    <span className="block">
                      {item.fileName ?? c.aFile}
                      {item.caption ? `: ${item.caption}` : ""}
                    </span>
                    <span className="nf-md-evidence__meta">
                      {[kindWord(item.mimeType, c), size(item.sizeBytes, c)].filter(Boolean).join(" · ")}
                      {" · "}
                      {item.fileUrl ? (
                        <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" className="nf-md-evidence__open">
                          {c.openFile}
                        </a>
                      ) : (
                        c.cannotOpen
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
