import Link from "next/link";

const PAGES = [
  ["stays-doors", "Add a workspace: the three stays doors"],
  ["host-property-photos", "A hotel's own photographs of its property"],
  ["host-property-photos-empty", "The same surface before the first photograph"],
  ["facilities-and-photos", "Facilities and photos, GOVERNING-10 screen four"],
  ["host-rooms", "The host's rooms and the nights they are on sale"],
  ["host-rooms-no-nights", "The same rooms with no night on sale at all"],
];

/** Track N, the stays side. The surfaces C2 built, drawn from fixtures. */
export default function PreviewC2() {
  return (
    <main className="nf-shell py-section">
      <h1 className="nf-h2">C2 surfaces</h1>
      <ul className="mt-md flex flex-col gap-xs">
        {PAGES.map(([slug, label]) => (
          <li key={slug}>
            <Link className="nf-link-quiet text-[var(--nf-content-link)]" href={`/preview/c2/${slug}`}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
