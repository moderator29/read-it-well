/**
 * A soft band of light that crosses a primary button on hover (Track M,
 * second pass). A child span rather than a pseudo-element because the
 * button's own `::after` is its light pool; this clips itself to the
 * button's radius and moves its band by transform only (landing-rooms.css).
 * Hidden from assistive tech; still under reduced motion and data saver.
 */
export function Sweep() {
  return <span className="nf-sweep" aria-hidden="true" />;
}
