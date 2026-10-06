import type { Dictionary, Locale } from "@vallo/i18n/core";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { DocRow, DocRows, DocSection, DocState } from "@/components/app/money/DocumentSheet";
import type { PartySide, VersionDiff, VersionEntry } from "./version-register";
import { momentLabel, termValue } from "./term-words";
import "./agreements.css";

type Copy = Dictionary["experienceMoney"]["agreements"];
type DiffCopy = Dictionary["memberKit"]["agreementDiff"];

/**
 * M2: THE VERSIONS, ON THE TERMS SHEET ITSELF.
 *
 * An agreement is a document that changes, and the paper that gets printed
 * and taken to a lawyer has to carry how it changed. So, under the current
 * terms and the two confirmations of THIS version, the sheet carries:
 *
 *   What changed from version N   the current version against the one
 *                                 before, line by line, the old value struck
 *                                 and the new one beside it. Built only from
 *                                 the two kept snapshots; when the earlier
 *                                 one was never kept the sheet says so in
 *                                 words rather than guessing.
 *   Every version                 newest first: how each came to be (drawn
 *                                 up, or changed by whom and when) and, for
 *                                 the versions it replaced, which side
 *                                 confirmed THAT version and when. A
 *                                 confirmation is bound to the version it
 *                                 names; the current version's two rows are
 *                                 the ones above, so they are not repeated.
 *
 * Nothing is drawn for a first version: there is nothing before it.
 *
 * Server-safe and stateless: every value arrives already decided by
 * `version-register.ts`. The struck value is also said in words for a
 * screen reader ("Was ... Now"), because a strike-through is not announced.
 */
export function AgreementVersions({
  diff,
  entries,
  names,
  locale,
  copy,
  diffCopy,
}: {
  diff: VersionDiff;
  entries: readonly VersionEntry[];
  names: Record<PartySide, string>;
  locale: Locale;
  copy: Copy;
  diffCopy: DiffCopy;
}) {
  if (diff.state === "first" || entries.length < 2) return null;
  const previous = diff.state === "ready" ? diff.from : diff.previous;
  return (
    <>
      <DocSection title={copy.changedFrom.replace("{n}", String(previous))} id="agreement-diff-title">
        {diff.state === "unkept" ? (
          <p className="nf-doc__note mt-xs" data-testid="agreement-diff-unkept">
            {copy.unkept.replace("{n}", String(previous))}
          </p>
        ) : diff.changes.length === 0 ? (
          <p className="nf-doc__note mt-xs" data-testid="agreement-diff-none">
            {copy.noLineMoved}
          </p>
        ) : (
          <DocRows className="nf-agr-diff mt-xs" testId="agreement-diff">
            {diff.changes.map((c) => {
              const before = termValue(c, c.before, locale, diffCopy.notStated);
              const after = termValue(c, c.after, locale, diffCopy.notStated);
              return (
                <DocRow key={c.key} label={c.label} numeric>
                  <span className="nf-agr-diff__values" data-testid={`agreement-diff-${c.key}`}>
                    <span className="sr-only">{diffCopy.was} </span>
                    {c.before === null ? (
                      <span className="nf-agr-diff__old">{before}</span>
                    ) : (
                      <s className="nf-agr-diff__old">{before}</s>
                    )}
                    <UiIcon name="arrow-right" size={14} className="nf-agr-diff__arrow" />
                    <span className="sr-only"> {diffCopy.now} </span>
                    <strong className="nf-agr-diff__new">{after}</strong>
                  </span>
                </DocRow>
              );
            })}
          </DocRows>
        )}
      </DocSection>

      <DocSection title={copy.versionsTitle} id="agreement-versions-title">
        <ol className="nf-agr-versions" data-testid="agreement-versions">
          {entries.map((entry) => (
            <li
              key={entry.version}
              className="nf-agr-version"
              data-current={entry.current ? "" : undefined}
              data-testid={`agreement-version-${entry.version}`}
            >
              <p className="nf-agr-version__head">
                <span className="nf-agr-version__n">{copy.version.replace("{n}", String(entry.version))}</span>
                {entry.current ? <span className="nf-agr-version__tag">{copy.thisVersion}</span> : null}
              </p>
              <p className="nf-agr-version__line">{madeLine(entry, names, locale, copy)}</p>
              {entry.current ? null : (
                <>
                  {!entry.kept && entry.made !== null ? <p className="nf-agr-version__line">{copy.notKept}</p> : null}
                  <ConfirmationsOf entry={entry} names={names} locale={locale} copy={copy} />
                  <p className="nf-agr-version__line">{copy.replacedBy.replace("{n}", String(entry.version + 1))}</p>
                </>
              )}
            </li>
          ))}
        </ol>
      </DocSection>
    </>
  );
}

/** How a version came to be, from the event that made it, or "not kept". */
function madeLine(entry: VersionEntry, names: Record<PartySide, string>, locale: Locale, copy: Copy): string {
  const made = entry.made;
  if (made?.kind === "drawn") return made.at ? copy.drawnUp.replace("{date}", momentLabel(made.at, locale)) : copy.drawnUpUndated;
  if (made?.kind === "changed") {
    if (made.by === null) return copy.changedUndated;
    const name = names[made.by];
    return made.at ? copy.changedBy.replace("{name}", name).replace("{date}", momentLabel(made.at, locale)) : copy.changedByUndated.replace("{name}", name);
  }
  return entry.kept ? copy.changedUndated : copy.notKept;
}

/** Which side confirmed a replaced version, each as a dated state; or neither. */
function ConfirmationsOf({
  entry,
  names,
  locale,
  copy,
}: {
  entry: VersionEntry;
  names: Record<PartySide, string>;
  locale: Locale;
  copy: Copy;
}) {
  const sides = (["renter", "owner"] as const).filter((side) => entry.confirmed[side] !== null);
  if (sides.length === 0) {
    return (
      <p className="nf-agr-version__line">
        <DocState done={false}>{copy.neitherConfirmed}</DocState>
      </p>
    );
  }
  return (
    <ul className="nf-agr-version__confirms">
      {sides.map((side) => (
        <li key={side}>
          <DocState done>
            {copy.confirmedBy.replace("{name}", names[side]).replace("{date}", momentLabel(entry.confirmed[side]!, locale))}
          </DocState>
        </li>
      ))}
    </ul>
  );
}
