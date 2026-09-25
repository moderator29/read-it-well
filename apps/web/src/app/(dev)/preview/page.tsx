import Link from "next/link";
import { BackButton } from "@/components/site/BackButton";

const GROUPS = ["lead", "f1", "f2", "f3", "f4", "f5", "e", "o3", "p3", "c2", "email/welcome", "track-f", "track-j"];

/**
 * The preview harness index.
 *
 * `/preview` declares `/` above it in `lib/nav/route-parents.ts` and drew no
 * back control, which put it in the same list as `/about` and `/search`. A
 * development surface is still a surface, and one that disagrees with the map
 * is one more place the map cannot be trusted from.
 */
export default function PreviewIndex() {
  return (
    <main className="nf-shell py-section">
      <BackButton fallback="/" />
      <h1 className="nf-h2 mt-sm">Preview harness</h1>
      <ul className="mt-md flex flex-col gap-xs">
        {GROUPS.map((g) => (
          <li key={g}>
            <Link className="nf-link" href={`/preview/${g}`}>
              {g}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
