import Link from "next/link";

/**
 * F1's index.
 *
 * It used to list four slugs - welcome, home, notifications, assistant - and
 * not one of them had a route, so every link on this page was a 404. Two of
 * the four were not F1's surfaces at all: home and the assistant belong to
 * F4. What F1 cannot photograph without a harness is anything that needs a
 * SESSION: the drawer only exists while a state flag is true, the header's
 * bell and avatar only exist for somebody with an account, and `/welcome`
 * guards itself and sends a signed-out visitor to `/sign-in`, so shooting
 * that address measures the door rather than the screen.
 */
const PAGES: [string, string][] = [
  ["chrome", "The app header and the five-slot dock, Property side"],
  ["drawer", "The side drawer open, with the flip coin at its foot"],
  ["dock-stays", "The dock after a flip: Stays in the first slot"],
  ["welcome", "First run, the two worlds, which /welcome redirects away from"],
];

export default function PreviewF1() {
  return (
    <main className="nf-shell py-section">
      <h1 className="nf-h2">F1: chrome and navigation</h1>
      <ul className="mt-md flex flex-col gap-xs">
        {PAGES.map(([slug, label]) => (
          <li key={slug}>
            <Link className="nf-link" href={`/preview/f1/${slug}`}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
      <p className="nf-body-sm mt-md text-[var(--nf-content-secondary)]">
        Sign in and sign up are real addresses. /welcome is not shootable: it sends a
        signed-out visitor to the door, which is why it has a harness page here.
      </p>
    </main>
  );
}
