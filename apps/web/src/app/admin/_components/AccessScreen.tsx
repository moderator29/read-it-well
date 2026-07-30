import Link from "next/link";
import { Logo } from "@/design-system/brand/Logo";
import { UiIcon } from "@/design-system/icons/UiIcon";
import {
  ADMIN_FORBIDDEN_MESSAGE,
  ADMIN_SIGNED_OUT_MESSAGE,
  ADMIN_UNCONFIGURED_MESSAGE,
} from "@/lib/admin/guard";

/**
 * What everyone who is not staff sees at /admin.
 *
 * A designed, branded screen rather than a blank page, a crash or a 404. It
 * says which of the three honest situations applies and offers the one action
 * that helps, and it carries no queue data, no counts and no names: the screen
 * a stranger reaches must reveal nothing about what the console holds.
 */
export function AccessScreen({ state }: { state: "unconfigured" | "signed-out" | "not-admin" }) {
  const copy =
    state === "unconfigured"
      ? {
          title: "The console is not open yet",
          body: ADMIN_UNCONFIGURED_MESSAGE,
          action: { href: "/", label: "Back to RentMe" },
        }
      : state === "signed-out"
        ? {
            title: "Staff sign in",
            body: ADMIN_SIGNED_OUT_MESSAGE,
            action: { href: "/sign-in", label: "Sign in" },
          }
        : {
            title: "You do not have console access",
            body: ADMIN_FORBIDDEN_MESSAGE,
            action: { href: "/home", label: "Back to your home" },
          };

  return (
    <main id="main" className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="nf-card w-full max-w-md p-6 text-center sm:p-8">
        <Link href="/" aria-label="RentMe home" className="inline-block">
          <Logo size={40} wordSize={20} />
        </Link>

        <span
          className="mx-auto mt-6 grid h-14 w-14 place-items-center rounded-full"
          style={{ background: "var(--nf-brand-primary-soft)", color: "var(--nf-electric-300)" }}
        >
          <UiIcon name="key" size={24} strokeWidth={1.9} />
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
            Sign in with another account
          </Link>
        )}
      </div>
    </main>
  );
}
