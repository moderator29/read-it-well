import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on every marketing and legal page.
 *
 * ONE FILE FOR ELEVEN ROUTES. `loading.tsx` boundaries cover their whole
 * subtree, so about, careers, contact, help, safety, standards, cancellations,
 * privacy, terms, the docs index and every docs slug all get this. The pages
 * differ in what they say and not at all in how they are shaped: a title, a
 * lead paragraph, then prose.
 *
 * These are the routes somebody follows a link to from outside the product,
 * often from a search result and often on a phone on mobile data, and until now
 * every one of them showed the previous page frozen until the whole document
 * arrived. `/docs/[slug]` and `/help` are the worst of it - both read content
 * on the server before they can render a single word.
 *
 * The `(site)` layout owns the header, the aurora and the footer, so all three
 * are already on screen. Only the article is outstanding.
 */
export default function LoadingSite() {
  return (
    <LoadingShell label="Loading" className="nf-shell py-12 sm:py-16">
      <Skeleton width="7rem" height="0.875rem" radius="sm" />
      <Skeleton width="min(28rem, 90%)" height="2.75rem" radius="sm" className="mt-4" />
      <Skeleton width="min(40rem, 100%)" height="1.25rem" radius="sm" className="mt-4" />

      {/* Prose. Three blocks with a short last line each, which is what a
          paragraph actually looks like and what stops this reading as a table. */}
      <div className="mt-10 max-w-[46rem] space-y-8">
        {Array.from({ length: 3 }, (_, block) => (
          <div key={block} className="space-y-3">
            <Skeleton width="14rem" height="1.5rem" radius="sm" />
            <Skeleton height="1rem" radius="sm" />
            <Skeleton height="1rem" radius="sm" />
            <Skeleton width="72%" height="1rem" radius="sm" />
          </div>
        ))}
      </div>
    </LoadingShell>
  );
}
