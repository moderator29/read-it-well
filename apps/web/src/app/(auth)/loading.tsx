import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on every auth screen.
 *
 * ONE FILE FOR ALL SEVEN. `loading.tsx` creates a Suspense boundary for its
 * segment AND everything nested under it, so this covers sign in, sign up,
 * both email forms, the verify screen, forgot password and reset password.
 * Seven near-identical files would have been seven chances to drift.
 *
 * The `(auth)` layout owns the aurora, the logo lockup and the glass panel, and
 * all three are already painted when this renders. Only the panel's contents
 * are outstanding, so this reserves the shape every one of those screens
 * shares: a heading, a line under it, and the controls.
 *
 * These routes were the most conspicuous gap in the platform's loading
 * coverage. `/sign-in` is reached by redirect from the middleware, which means
 * a person who typed a product address and was bounced here saw the page they
 * were leaving, frozen, for the whole round trip - the one moment in the
 * product where a stall reads as "this app is broken" rather than "this is
 * slow".
 */
export default function LoadingAuth() {
  return (
    <LoadingShell label="Loading" className="w-full">
      {/* The heading pair, centred, at the real sizes. */}
      <Skeleton width="11rem" height="1.75rem" radius="sm" className="mx-auto" />
      <Skeleton width="14rem" height="1rem" radius="sm" className="mx-auto mt-2.5" />

      {/* The controls. Three rows at the auth row height, which is what both
          the choice screen and the email forms resolve to. */}
      <div className="mt-6 space-y-2.5">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} height="3.25rem" radius="lg" />
        ))}
      </div>

      <Skeleton width="12rem" height="0.875rem" radius="sm" className="mx-auto mt-6" />
    </LoadingShell>
  );
}
