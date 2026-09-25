/**
 * WORDS THAT ARRIVE OUT OF DEPTH (Track M, 25 September 2026).
 *
 * The wordmark in the splash assembles a letter at a time; a headline does
 * the same a word at a time, each one coming in large, blurred and faint and
 * landing sharp, sixty milliseconds after the one before. `start` continues
 * the count across two lines of one heading so the second line follows the
 * first rather than racing it.
 *
 * The text stays whole for a screen reader: every word is an ordinary inline
 * span with the spaces kept between them, so the heading reads as written.
 * The motion is `.nf-depth-word` in threshold.css, with a reduced-motion
 * answer there.
 */
export function DepthWords({ text, start = 0 }: { text: string; start?: number }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <>
      {words.map((word, i) => (
        <span key={`${i}-${word}`} className="nf-depth-word" style={{ "--nf-i": start + i } as React.CSSProperties}>
          {word}
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </>
  );
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
