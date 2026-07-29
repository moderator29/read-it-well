import Link from "next/link";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";

/**
 * What a visitor sees at /agent/list when they are not an approved agent.
 *
 * Two honest variants of one design: sign in, or apply. Neither pretends the
 * wizard is one tap away, and both give the next step rather than a dead end.
 */
const POINTS: { icon: UiIconName; title: string; body: string }[] = [
  {
    icon: "verified",
    title: "Verified supply only",
    body: "Every listing is checked by hand, so the badge on your property means something to guests.",
  },
  {
    icon: "chat-bubble",
    title: "Guests reach you inside RentMe",
    body: "Chats, inspections and payments stay on the platform, where they are protected.",
  },
  {
    icon: "wallet",
    title: "You keep what you charge",
    body: "RentMe charges you nothing to list. Your price is your price.",
  },
];

export function ListingPitch({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="mx-auto max-w-lg py-6 text-center sm:py-10">
      <span
        className="mx-auto grid h-16 w-16 place-items-center rounded-[var(--nf-radius-lg)]"
        style={{ background: "var(--nf-gradient-agent)", color: "#fff" }}
      >
        <UiIcon name="key" size={30} strokeWidth={1.9} />
      </span>

      <h1 className="nf-h2 mt-5">List your property on RentMe</h1>
      <p className="mx-auto mt-3 max-w-[44ch] text-[var(--nf-content-secondary)]">
        {signedIn
          ? "Listing is open to approved agents. The application takes about two minutes and we review within 24 to 48 hours."
          : "Sign in to your agent account to start a listing, or apply in about two minutes if you are new here."}
      </p>

      <ul className="mt-7 space-y-3 text-left">
        {POINTS.map((point) => (
          <li key={point.title} className="nf-card flex items-start gap-3 p-4">
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--nf-radius-md)]"
              style={{ background: "var(--nf-surface-raised)", color: "var(--nf-electric-300)" }}
            >
              <UiIcon name={point.icon} size={20} />
            </span>
            <span className="min-w-0 leading-snug">
              <span className="block text-[0.9375rem] font-semibold">{point.title}</span>
              <span className="mt-1 block text-[0.8125rem] text-[var(--nf-content-secondary)]">
                {point.body}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-7 flex flex-col gap-3">
        <Link href="/agents/apply" className="nf-btn nf-btn--primary">
          Become an agent
        </Link>
        {!signedIn && (
          <Link href="/sign-in" className="nf-btn nf-btn--glass">
            Sign in
          </Link>
        )}
        <Link href="/agents" className="nf-btn nf-btn--glass">
          How listing works
        </Link>
      </div>
    </div>
  );
}
