import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell } from "@/components/app/ScreenSkeleton";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";

/**
 * One auth screen, before its form: the shared shape the `(auth)` segment
 * loading files draw inside the column the auth layout already painted (the
 * bowl, the wordmark, the glass ring and the legal foot are the layout's and
 * are on screen during the wait). Glass slabs, because every auth control is
 * glass on the slate. Only the screen's own parts are reserved: the centred
 * title and its lines, the labelled fields (a name pair, a field, or the six
 * code rings), the pill, and the quiet line or pill under it.
 */
export type AuthSkeletonField = "field" | "pair" | "code";

export async function AuthScreenSkeleton({
  sub = 0,
  fields = [],
  divider = false,
  quiet = false,
  links = 1,
}: {
  /** Lines of the sentence under the title. */
  sub?: number;
  fields?: AuthSkeletonField[];
  /** The "Or" rule between the pill and the quiet pill (sign up). */
  divider?: boolean;
  /** A second, quiet pill under the first. */
  quiet?: boolean;
  /** Text links under the pill ("Use my password instead"). */
  links?: number;
}) {
  /* The same words the segment's own loading file announces, in the
     reader's language. */
  const label = getDictionary(await getLocale()).authFlow.loading;
  return (
    <LoadingShell label={label} className="nf-auth__screen">
      <Skeleton glass width="12rem" height="2.25rem" radius="sm" className="mx-auto max-w-full" />
      {Array.from({ length: sub }, (_, i) => (
        <Skeleton
          key={i}
          glass
          width={i === sub - 1 && sub > 1 ? "60%" : "88%"}
          height="1rem"
          radius="sm"
          className={i === 0 ? "mx-auto mt-xs" : "mx-auto mt-2xs"}
        />
      ))}
      <div aria-hidden="true" className="nf-auth__form nf-auth__form--fields">
        {fields.map((kind, i) =>
          kind === "pair" ? (
            <div key={i} className="grid grid-cols-2 gap-sm">
              {[0, 1].map((j) => (
                <div key={j}>
                  <Skeleton glass width="5rem" height="0.875rem" radius="sm" className="mb-xs" />
                  <Skeleton glass height="3.25rem" radius="lg" />
                </div>
              ))}
            </div>
          ) : kind === "code" ? (
            <div key={i}>
              <Skeleton glass width="8rem" height="0.875rem" radius="sm" className="mb-xs" />
              <div className="grid grid-cols-6 gap-xs">
                {Array.from({ length: 6 }, (_, j) => (
                  <Skeleton key={j} glass circle width="100%" />
                ))}
              </div>
            </div>
          ) : (
            <div key={i}>
              <Skeleton glass width="7rem" height="0.875rem" radius="sm" className="mb-xs" />
              <Skeleton glass height="3.25rem" radius="lg" />
            </div>
          ),
        )}
        <Skeleton glass height="3.25rem" radius="pill" />
        {divider ? <Skeleton glass width="2rem" height="0.75rem" radius="sm" className="mx-auto" /> : null}
        {quiet ? <Skeleton glass height="3.25rem" radius="pill" /> : null}
        {Array.from({ length: links }, (_, i) => (
          <Skeleton key={i} glass width="11rem" height="1rem" radius="sm" className="mx-auto" />
        ))}
      </div>
    </LoadingShell>
  );
}
