import { Icon, type IconName } from "@/design-system/icons/Icon";

/**
 * Wallet trust strip.
 *
 * Three mini feature tiles stating plainly how wallet money is protected and
 * what ships with launch, so the surface sets expectations honestly instead
 * of implying protections that are not live yet.
 */

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "secure",
    title: "Bank-level encryption",
    body: "Wallet writes happen only on our servers, never from a browser.",
  },
  {
    icon: "verified",
    title: "Ledger-recorded to the kobo",
    body: "Every movement lives in a permanent, kobo-exact ledger.",
  },
  {
    icon: "settings",
    title: "PIN and 2FA at launch",
    body: "A transaction PIN and two-factor authentication ship with launch.",
  },
];

export function SecurityNote() {
  return (
    <ul className="grid grid-cols-3 gap-2" aria-label="How your money is protected">
      {FEATURES.map((f) => (
        <li key={f.title} className="nf-card flex flex-col items-center px-2.5 py-4 text-center">
          <span className="h-7 w-7">
            <Icon name={f.icon} fill />
          </span>
          <p className="mt-2 text-[0.72rem] font-semibold leading-snug">{f.title}</p>
          <p className="mt-1 hidden text-[0.68rem] leading-relaxed text-[var(--nf-content-muted)] sm:block">
            {f.body}
          </p>
        </li>
      ))}
    </ul>
  );
}
