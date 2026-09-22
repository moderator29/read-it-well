import Link from "next/link";
import type { Dictionary } from "@vallo/i18n";
import { Logo } from "@/design-system/brand/Logo";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ButtonLink } from "@/components/ui/Button";

/**
 * What everyone who is not staff sees at /admin.
 *
 * A designed, branded screen rather than a blank page, a crash or a 404. It
 * says which of the three honest situations applies and offers the one action
 * that helps, and it carries no queue data, no counts and no names: the screen
 * a stranger reaches must reveal nothing about what the console holds.
 *
 * The three refusals live in the dictionary, so a member who set their language
 * to Hausa is refused in Hausa. `lib/admin/guard` keeps its own English copies
 * for what a server action returns to a caller with no page around it.
 */
export function AccessScreen({
  t,
  state,
}: {
  t: Dictionary;
  state: "unconfigured" | "signed-out" | "not-admin";
}) {
  const a = t.admin.access;
  const copy =
    state === "unconfigured"
      ? {
          title: a.unconfiguredTitle,
          body: a.unconfiguredBody,
          action: { href: "/", label: a.backToVallo },
        }
      : state === "signed-out"
        ? {
            title: a.signedOutTitle,
            body: a.signedOutBody,
            action: { href: "/sign-in", label: a.signIn },
          }
        : {
            title: a.notAdminTitle,
            body: a.notAdminBody,
            action: { href: "/home", label: a.backToYourHome },
          };

  return (
    <main id="main" className="flex min-h-dvh items-center justify-center px-md py-2xl">
      <div className="nf-card w-full max-w-md p-lg text-center sm:p-xl">
        {/*
          `block w-fit mx-auto` AND NOT `inline-block`, ON BOTH ANCHORS.

          Measured rather than inferred: both of these computed to `width: 32px`
          inside a 308px container, so the logo lockup overflowed its own box
          and sat visibly right of centre, and "Sign in with another account"
          rendered as five stacked words, one per line. Reproduced on fresh
          loads at 390, 430, 768 and 1280 in both themes. No CSS rule sets a
          width; removing `inline-block` restores 179px, and a fresh
          `inline-block` probe in the same parent also measures 179px, so it is
          a shrink-to-fit inside the `min-h-dvh` flex container rather than a
          rule anybody wrote. The mechanism is not root-caused and the fix does
          not depend on it: a block that sizes to its content cannot collapse
          this way.

          This is the first thing anybody sees at `/admin`, in all three
          refusal states.
        */}
        <Link
          href="/"
          aria-label={t.a11y.logoHome}
          className="mx-auto block w-fit"
        >
          <Logo size={48} wordSize={24} />
        </Link>

        {/*
          NO PLATE BEHIND THE GLYPH.

          `docs/ICON_SYSTEM.md` records that a tinted tile behind a glyph came
          from the retired reference brief and is not part of this system, and
          in the light theme `--nf-brand-primary-soft` on white reads distinctly
          LAVENDER, which is a hue this brand has banned by name. What stops an
          object floating is its size and the air around it, not a box, which is
          the conclusion `ComingSoon` had already reached.
        */}
        <span className="mt-lg flex justify-center text-[var(--nf-content-link)]">
          <UiIcon name="key" size={32} />
        </span>

        <h1 className="nf-h2 mt-md text-[length:var(--nf-text-h4)]">{copy.title}</h1>
        <p className="mx-auto mt-xs max-w-[42ch] text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
          {copy.body}
        </p>

        <ButtonLink href={copy.action.href} variant="primary" full className="mt-lg">
          {copy.action.label}
        </ButtonLink>

        {state !== "signed-out" && (
          <Link
            href="/sign-in"
            className="mx-auto mt-sm block w-fit text-[length:var(--nf-text-caption)] font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline"
          >
            {a.otherAccount}
          </Link>
        )}
      </div>
    </main>
  );
}
