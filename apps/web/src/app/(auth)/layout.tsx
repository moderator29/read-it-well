import Image from "next/image";
import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";

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
 * THE SKY IS DRAWN, NOT PHOTOGRAPHED. The plate that stood here was
 * `bg-blue-wave.jpg`, horizontal swells across a flat navy, which is a
 * different sky from the render's vertical curtains and mirrored horizon.
 * The render itself cannot be used as a plate because its card, lockup and
 * words are painted into it. So the curtains are five blurred ribbons and the
 * horizon is one element, all from tokens, and they sit in this subtree where
 * no rule in `light.css` reaches them (the old `.nf-aurora` and
 * `.nf-grid-veil` were switched off by `light.css` in light mode, which is
 * the leak `docs/research/LIGHT_MODE_SURVEY.md` 9.5 names).
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
     * The second half of the ruling is that this surface carries NO LIGHT
     * TWIN, because a rule keyed on `:root[data-theme="light"] .nf-auth__x`
     * still matches when the document really is light. What light mode owes
     * this screen is that it renders IDENTICALLY, logo, sky and all, and the
     * Session B ledger section 3 records the measurement.
     */
    <main id="main" className="nf-auth" data-theme="dark">
      <div className="nf-auth__sky" aria-hidden="true">
        <span className="nf-auth__ribbon nf-auth__ribbon--l1" />
        <span className="nf-auth__ribbon nf-auth__ribbon--l2" />
        <span className="nf-auth__ribbon nf-auth__ribbon--r1" />
        <span className="nf-auth__ribbon nf-auth__ribbon--r2" />
        <span className="nf-auth__ribbon nf-auth__ribbon--r3" />
      </div>

      <div className="nf-auth__lang">
        <LanguageSwitcher current={locale} label={t.a11y.languageSwitcher} compact />
      </div>

      <div className="nf-auth__stage">
        <div className="nf-auth__ground" aria-hidden="true" />

        <Link href="/" aria-label={t.a11y.logoHome} className="nf-auth__brand">
          <Image
            src="/brand/vallo-icon.png"
            alt=""
            width={296}
            height={296}
            priority
            className="nf-auth__icon"
          />
          <Image
            src="/brand/vallo-wordmark.png"
            alt="Vallo"
            width={432}
            height={78}
            priority
            className="nf-auth__wordmark"
          />
        </Link>

        <div className="nf-auth__card">{children}</div>
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
