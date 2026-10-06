import { formatDate, formatNumber, type Dictionary, type Locale } from "@vallo/i18n/core";
import { passedCount, type PathRung } from "./verification-path";
import "./verification-path.css";

/**
 * THE VERIFICATION PATH (reference 7110; north star 10 F).
 *
 * A progress path with ticks: each rung is a node on a rail and a Plate beside
 * it that says what was actually checked, what state the rung is in, and the
 * date a reviewer decided it. The states are said in a word and a shape
 * (tick, cross, ring, number), never in colour alone. Nothing here decides
 * anything: the model (`verification-path.ts`) is built from the reviewer's own
 * decisions, and a rung with no decision behind it is never drawn as passed.
 *
 * MOTION. The rungs arrive 60ms apart (four of them, well inside the six-item
 * stagger cap), each tick draws once after its rung lands, and each connector
 * fills down to the next reached rung. It plays once, on mount. Nothing pops
 * here: the one payoff on this route is the approval moment
 * (`SuccessFromFlag`), which this does not duplicate.
 *
 * Server-safe: nothing here holds state.
 */
type Copy = Dictionary["experienceAccount"]["verification"];

function Mark({ state, step }: { state: PathRung["state"]; step: number }) {
  if (state === "passed") {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" className="nf-vpath__glyph">
        <path className="nf-vpath__tick" d="M3.5 8.4 6.7 11.5 12.5 4.8" pathLength={1} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (state === "failed") {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" className="nf-vpath__glyph">
        <path d="M4.5 4.5 11.5 11.5M11.5 4.5 4.5 11.5" fill="none" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return <span className="nf-vpath__num nf-numeric">{step}</span>;
}

export function VerificationPath({
  rungs,
  copy,
  locale,
}: {
  rungs: readonly PathRung[];
  copy: Copy;
  locale: Locale;
}) {
  const done = passedCount(rungs);
  const word: Record<PathRung["word"], string> = {
    passed: copy.passed,
    failed: copy.failedLabel,
    inReview: copy.inReview,
    documentsApproved: copy.documentsApproved,
    documentsRejected: copy.documentsRejected,
    next: copy.next,
    later: copy.later,
  };

  return (
    <section className="nf-vpath-wrap" aria-label={copy.pathLabel} data-testid="verification-path">
      <header className="nf-vpath-head">
        <h2 className="nf-vpath-head__title">{copy.pathLabel}</h2>
        <p className="nf-vpath-head__count nf-numeric">
          {copy.stepsOf.replace("{done}", formatNumber(done, locale)).replace("{total}", formatNumber(rungs.length, locale))}
        </p>
      </header>
      <p className="nf-vpath-lede">{copy.pathLede}</p>
      <ol className="nf-vpath">
        {rungs.map((rung, index) => {
          const next = rungs[index + 1];
          /* The connector below a rung is solid once the next rung has been reached. */
          const link = next && (next.state === "passed" || next.state === "current" || next.state === "failed") ? "solid" : "dashed";
          return (
            <li
              key={rung.key}
              className="nf-vpath__rung"
              data-state={rung.state}
              data-link={next ? link : "none"}
              style={{ "--i": index } as React.CSSProperties}
              data-testid={`path-rung-${rung.key}`}
            >
              <span className="nf-vpath__node" aria-hidden="true">
                <Mark state={rung.state} step={index + 1} />
              </span>
              <div className="nf-vpath__plate">
                <div className="nf-vpath__top">
                  <h3 className="nf-vpath__label">{rung.label}</h3>
                  <span className="nf-vpath__state">{word[rung.word]}</span>
                </div>
                <p className="nf-vpath__kicker">{rung.state === "passed" ? copy.checkedLabel : copy.willCheckLabel}</p>
                <p className="nf-vpath__evidence">{rung.evidence}</p>
                {rung.decidedAt && (rung.state === "passed" || rung.state === "failed") ? (
                  <p className="nf-vpath__when nf-numeric">
                    {(rung.state === "passed" ? copy.passedOn : copy.refusedOn).replace(
                      "{date}",
                      formatDate(new Date(rung.decidedAt), locale, { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" }),
                    )}
                  </p>
                ) : null}
                {rung.state === "failed" && rung.note ? (
                  <p className="nf-vpath__note">
                    <span>{copy.reviewerSaid} </span>
                    {rung.note}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
