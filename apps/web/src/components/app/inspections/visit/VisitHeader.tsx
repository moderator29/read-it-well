import { BackControl } from "@/components/ui/BackControl";

/**
 * The flow's own bar: the shared back control (BACK_NAVIGATION.md: it reads
 * the declared parent, `/listing/[id]`, and returns to the screen behind
 * when that is safe), the title, and the two-step progress.
 */
export function VisitHeader({
  title,
  step,
  progressLabel,
  fallback,
}: {
  title: string;
  step: 1 | 2;
  /** "Step {step} of {total}", already filled. */
  progressLabel: string;
  /** The listing, for a cold open. */
  fallback: string;
}) {
  return (
    <header className="nf-visit__head">
      <BackControl fallback={fallback} surface="round" />
      <h1 className="nf-visit__title">{title}</h1>
      <span aria-hidden="true" />
      <div className="nf-visit__progress" role="img" aria-label={progressLabel} data-testid="visit-progress" data-step={step}>
        <span className="nf-visit__dot" data-on={step < 2} />
        <span className="nf-visit__dot" data-on={step > 1} />
      </div>
    </header>
  );
}
