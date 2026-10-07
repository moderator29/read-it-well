import type { ReactNode } from "react";
import { getDictionary } from "@vallo/i18n";
import { LoadingShell } from "@/components/app/ScreenSkeleton";
import { getLocale } from "@/lib/locale";
import { providerPolicy, surfaceFromUserAgent, type SignInSurface } from "@/lib/auth/providers";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { headers } from "next/headers";
import "@/app/css/auth.css";

/**
 * THE WAIT IS THE SCREEN, NOT A PICTURE OF ONE (U1, 6 October; the first
 * 400ms).
 *
 * Sign in is often the first Vallo screen a person ever sees, and it was
 * streamed in two acts: a skeleton of glass slabs, then the form. The two were
 * different heights (measured at 390: 336 then 542 on /sign-in, 460 then 778
 * on /sign-up/email), so the island grew as the form landed and the small
 * print under it jumped (layout shift 0.004 to 0.018, the only shifts on the
 * auth screens), and a generic slab skeleton of the group was the first thing
 * painted on EVERY auth URL, before the screen's own.
 *
 * So the wait draws THE SCREEN ITSELF: the same form component the page will
 * render, with the same words, held `inert` (it cannot be typed into or
 * tapped, and it is out of the accessibility tree) inside the one loading
 * state, which tells a screen reader it is loading. When the page arrives it
 * replaces an identical layout, so nothing moves; and because the wait was
 * painted, the arriving screen does not replay its entrance (auth.css, "THE
 * WAIT"). What the wait cannot know it does not guess: the Apple door, which
 * needs a network read, is left out, and joins the row if it is on.
 */
export async function AuthWait({ children }: { children: ReactNode }) {
  const label = getDictionary(await getLocale()).authFlow.loading;
  return (
    <LoadingShell label={label} className="nf-auth__wait">
      <div inert>{children}</div>
    </LoadingShell>
  );
}

/**
 * What the wait can know of the provider doors without a network read: the
 * surface and the Google switch are request and environment facts; Apple is
 * what Supabase reports, which the page reads and the wait does not.
 */
export async function waitDoors(): Promise<{ surface: SignInSurface; googleReady: boolean; emailReady: boolean }> {
  const surface = surfaceFromUserAgent((await headers()).get("user-agent"));
  const states = providerPolicy({
    surface,
    supabaseConfigured: isSupabaseConfigured(),
    supabaseApple: false,
    env: process.env,
  });
  const on = (id: "email" | "google") => states.some((s) => s.id === id && s.configured);
  return { surface, googleReady: on("google"), emailReady: on("email") };
}
