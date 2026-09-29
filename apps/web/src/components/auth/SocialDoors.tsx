import type { Dictionary } from "@vallo/i18n/core";
import type { SignInSurface } from "@/lib/auth/providers";
import { startAppleOAuth, startGoogleOAuth } from "@/lib/auth/actions";
import { AppleMark, NativeAppleSignIn } from "./NativeAppleSignIn";
import { AuthOrRule, AuthSocialButton, AuthSocialRow, GoogleMark } from "./slate";

/**
 * The round provider doors under the "Or" rule: Google and Apple, the two
 * providers Vallo runs (`lib/auth/providers.ts`). There is no Facebook door
 * because there is no Facebook provider, and a button that can only fail is
 * worse than no button.
 *
 * THE SAME RULES AS THE ROWS THEY REPLACE (`AuthChoices`):
 *   Google   drawn only when configured AND on the website; inside a shell the
 *            redirect door cannot complete (STORE-03).
 *   Apple    the native sheet inside the iOS shell, the redirect door on the
 *            website, nothing inside the Android shell.
 * Each web door is its own small form posting to the real server action with
 * `next` and the intent, exactly as the callback expects, so this sits
 * OUTSIDE any other form on the screen (forms cannot nest).
 *
 * No "use client": the forms post server actions and work before hydration,
 * and the file imports cleanly into a client form as well.
 */
export function SocialDoors({
  t,
  googleReady,
  appleReady,
  surface = "web",
  next,
  intent,
}: {
  t: Dictionary;
  googleReady: boolean;
  appleReady: boolean;
  surface?: SignInSurface;
  next?: string | undefined;
  intent: "sign-in" | "sign-up";
}) {
  const google = googleReady && surface === "web";
  const apple = appleReady && (surface === "web" || surface === "ios-native");
  if (!google && !apple) return null;

  return (
    <>
      <AuthOrRule>{t.auth.orDivider}</AuthOrRule>
      <AuthSocialRow label={t.auth.socialLabel}>
        {google && (
          <form action={startGoogleOAuth}>
            {next ? <input type="hidden" name="next" value={next} /> : null}
            <input type="hidden" name="intent" value={intent} />
            <AuthSocialButton label={t.auth.continueWithGoogle}>
              <GoogleMark />
            </AuthSocialButton>
          </form>
        )}
        {apple &&
          (surface === "ios-native" ? (
            <NativeAppleSignIn label={t.auth.continueWithApple} next={next} round />
          ) : (
            <form action={startAppleOAuth}>
              {next ? <input type="hidden" name="next" value={next} /> : null}
              <input type="hidden" name="intent" value={intent} />
              <AuthSocialButton label={t.auth.continueWithApple}>
                <AppleMark />
              </AuthSocialButton>
            </form>
          ))}
      </AuthSocialRow>
    </>
  );
}
