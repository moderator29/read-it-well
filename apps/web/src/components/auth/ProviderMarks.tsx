/**
 * The sign-in marks. One left, and it is ours.
 *
 * `GoogleMark` and `AppleMark` used to live here, drawn to the two companies'
 * official geometry in their official colours, and this file carried a blanket
 * `eslint-disable nf/no-raw-colour` for them: five brand hexes that could not
 * be tokenised, must not follow our theme, and would be a trademark problem if
 * approximated. RentMe does not offer Google or Apple sign in, so the marks
 * went with the buttons and the exception went with the marks.
 *
 * What is left is an envelope on `currentColor`, which is the whole point: it
 * is a RentMe glyph, it takes the ink of the row it sits in, and it is correct
 * in both themes without a single literal colour in this file.
 */

export function MailMark({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
      <path d="m3.2 6.5 8.02 5.9a1.3 1.3 0 0 0 1.56 0l8.02-5.9" />
    </svg>
  );
}
