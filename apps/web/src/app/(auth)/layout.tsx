import Image from "next/image";
import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { AuthBackBar } from "./AuthBackBar";
import { ForgetOnSignOut } from "@/components/app/offline/ForgetOnSignOut";

/**
 * Auth shell, to its governing image (`55A56F21`, "Welcome back").
 *
 * Top to bottom, as the render stacks it: the aurora sky with its light
 * curtains, the app icon tile, the chrome wordmark,
 * the glass card, and the lit glass plinth the card stands on, with the
 * horizon and the reflective ground behind it. Every auth screen renders
 * inside the one card so sign in, sign up, the code, the reset and the
 * recovery all read as the same object; only the card's contents change.
 * `app/css/auth.css` is the whole surface.
 *
 * THE ART IS THE RENDER'S OWN, on the founder's instruction of 22 September
 * (`docs/SESSION_B_SCOPE.md` section 9). Two crops, cut by
 * `scripts/design/session-b-crops.mjs` into `public/brand/session-b/signin/`:
 * the STAGE (the render with its painted card, lockup and slogan lifted out:
 * sky, light curtains, horizon, glass plinth, mirror floor) and the LOCKUP
 * (the app tile and chrome wordmark as drawn). The stage is scaled with the
 * card and anchored at the card's foot, so the plinth is always under the
 * live card exactly where the render puts it. The card, the fields, the
 * buttons and every word stay live HTML. None of it sits under a class that
 * `light.css` reaches (the old `.nf-aurora` and `.nf-grid-veil` were switched
 * off by `light.css` in light mode, the leak the light survey 9.5 names).
 *
 * THE RENDER'S SLOGAN DOES NOT SHIP, and nothing replaces it. The founder
 * removed it on 22 September, and the standing rule in
 * `docs/design/references/roles/README.md` is that the images govern FORM,
 * never claims: a positioning line is a statement, and statements come from
 * us. The wordmark keeps the space.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    /*
     * `data-theme="dark"`, and it is a ruling rather than a preference.
     *
     * The auth screen stays dark in BOTH themes, permanently (rule 22). It is
     * the register setter for a money product and the founder has closed the
     * question. The attribute works because `tokens.css` declares the dark
     * palette on `:root, [data-theme="dark"]`, so this element and everything
     * inside it take the dark values whatever the document is set to.
     *
     * DARK ONLY: light mode was removed from the platform on 23 September.
     * The attribute stays so the tokens resolve dark here whatever the root
     * says while the rest of the platform finishes that change.
     */
    <main id="main" className="nf-auth" data-theme="dark">
      <AuthBackBar />
      {/* V-35, V-77: a phone at the way in keeps nobody's gate code or shortlist. */}
      <ForgetOnSignOut />
      <div className="nf-auth__lang">
        <LanguageSwitcher current={locale} label={t.a11y.languageSwitcher} compact />
      </div>

      <div className="nf-auth__stage">
        <div className="nf-auth__scene" aria-hidden="true" />

        <Link href="/" aria-label={t.a11y.logoHome} className="nf-auth__brand">
          <Image
            src="/brand/session-b/signin/lockup.webp"
            alt=""
            width={464}
            height={452}
            priority
            className="nf-auth__lockup"
            /* Served as cut: the file is already an optimised WebP at its
               source resolution, and the optimiser re-encoded its alpha at
               q75 and upscaled it past the source (and cached the old cut
               across builds, which is how a keyed-out sky came back). */
            unoptimized
          />
        </Link>

        {/* The shared panel (platform sweep); `nf-auth__card` keeps only
            what the render measures differently. */}
        <div className="nf-panel nf-panel--glass nf-auth__card">{children}</div>
        <div className="nf-auth__podium" aria-hidden="true" />
      </div>

      {/*
        The small print, under the plinth rather than inside the card. The
        render's card ends at the sign-up line; the notice still has to be on
        the screen, because a person who makes an account with Google from
        here passes no tick. Every auth screen gets it the same way.
      */}
      <p className="nf-auth__legal">
        {t.auth.termsNotice} <Link href="/terms">{t.safety.termsLink}</Link>
        {" · "}
        <Link href="/privacy">{t.safety.privacyLink}</Link>
        {" · "}
        <Link href="/eula">{t.safety.rulesLink}</Link>
      </p>
    </main>
  );
}
