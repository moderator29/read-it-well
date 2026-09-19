import Image from "next/image";
import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";

/**
 * Auth shell, to its governing image (`docs/design/references/55A56F21`).
 *
 * The app icon and the wordmark stacked over the aurora plate, the slogan
 * beneath them, the glass card standing on its podium with the podium's
 * reflection in the floor. Every auth screen renders inside the one card so
 * sign in, sign up, the code, the reset and the recovery all read as the same
 * object; only the card's contents change. `app/css/auth.css` is the whole
 * surface, both themes.
 *
 * The plate is the reference photograph, sized and compressed through
 * next/image, and it sits UNDER the CSS aurora on purpose: until the file is
 * filed the page is still the designed aurora, and once it lands the aurora
 * simply gains its photograph. The lockup is the supplied tile rather than a
 * redraw, because this is the one place the logo is shown large, which is
 * exactly what the supplied artwork is for.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    /*
     * `data-theme="dark"`, and it is a ruling rather than a preference.
     *
     * The auth screen stays dark in BOTH themes, permanently (rule 22). It is
     * the register setter for a money product: the first thing a stranger sees
     * of Vallo, and the screen that has to look like somewhere it is safe to
     * put a naira balance. Every serious money app in this market does exactly
     * this, and the founder has closed the question rather than left it open.
     *
     * The attribute works because `tokens.css` declares the dark palette on
     * `:root, [data-theme="dark"]`, so this element and everything inside it
     * take the dark values whatever the document is set to. It is not a
     * specificity trick: a custom property declared on a descendant wins for
     * that subtree over the value it would otherwise inherit.
     *
     * The second half of the ruling is that this surface carries NO LIGHT
     * TWIN, because a rule keyed on `:root[data-theme="light"] .nf-auth__x`
     * still matches when the document really is light, attribute or no
     * attribute. Anything left in `auth.css` under that selector would fight
     * this and win, so it goes.
     *
     * A LIGHT INK WORDMARK IS STILL OWED, for the surfaces that are genuinely
     * white: email headers, receipts and PDFs, the store listing and print.
     * Until that render exists those surfaces use the TEXT wordmark, never a
     * filtered version of the photographic one, because an ink version of a
     * photographic render is a new render and not a filter. This screen is
     * not one of those surfaces and never will be.
     */
    <main id="main" className="nf-auth" data-theme="dark">
      <div className="nf-auth__plate" aria-hidden="true">
        <Image src="/brand/photos/bg-blue-wave.jpg" alt="" fill sizes="100vw" priority />
      </div>
      <div className="nf-aurora" aria-hidden="true" />
      <div className="nf-grid-veil" aria-hidden="true" />

      <div className="nf-auth__lang">
        <LanguageSwitcher current={locale} label={t.a11y.languageSwitcher} compact />
      </div>

      <div className="nf-auth__stage">
        <Link href="/" aria-label={t.a11y.logoHome} className="nf-auth__brand">
          <Image
            src="/brand/vallo-icon.png"
            alt=""
            width={112}
            height={112}
            priority
            className="nf-auth__icon"
          />
          <Image
            src="/brand/vallo-wordmark.png"
            alt="Vallo"
            width={192}
            height={40}
            priority
            className="nf-auth__wordmark"
          />
          {/* The slogan rides under the lockup, quiet and letter-spaced. This
              is one of the few places it belongs: beside the logo, never as a
              headline. See PRODUCT.md section 7. */}
          <span className="nf-auth__slogan">{t.landing.slogan}</span>
        </Link>

        <div className="nf-auth__card">{children}</div>
        <div className="nf-auth__podium" aria-hidden="true" />

        <Link href="/" className="nf-tap nf-auth__back">
          {t.auth.backToHome}
        </Link>
      </div>
    </main>
  );
}
