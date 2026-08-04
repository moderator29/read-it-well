import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";
import { Logo } from "@/design-system/brand/Logo";
import { UiIcon } from "@/design-system/icons/UiIcon";

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
          action: { href: "/", label: a.backToRentMe },
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
    <main id="main" className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="nf-card w-full max-w-md p-6 text-center sm:p-8">
        <Link href="/" aria-label={t.a11y.logoHome} className="inline-block">
          <Logo size={40} wordSize={20} />
        </Link>

        <span
          className="mx-auto mt-6 grid h-14 w-14 place-items-center rounded-full"
          style={{ background: "var(--nf-brand-primary-soft)", color: "var(--nf-electric-300)" }}
        >
          <UiIcon name="key" size={24} />
        </span>

        <h1 className="nf-h2 mt-4 text-[1.375rem]">{copy.title}</h1>
        <p className="mx-auto mt-2 max-w-[42ch] text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
          {copy.body}
        </p>

        <Link href={copy.action.href} className="nf-btn nf-btn--primary mt-6 w-full">
          {copy.action.label}
        </Link>

        {state !== "signed-out" && (
          <Link
            href="/sign-in"
            className="mt-3 inline-block text-[0.8125rem] font-semibold text-[var(--nf-electric-300)] underline-offset-4 hover:underline"
          >
            {a.otherAccount}
          </Link>
        )}
      </div>
    </main>
  );
}
