import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";
import "@/app/css/ported.css";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { cn } from "@/lib/cn";

/**
 * BOOK A CALL: THE EXPANDING CAPSULE, FOR MARKETING SURFACES ONLY.
 *
 * Rebuilt from the founder's `book-call-button.tsx`, in Vallo's colours (the
 * original's lime `#82ff22` is not a Vallo colour in any theme). At rest a brand
 * capsule sits at the leading end of the pill carrying an arrow, with the label
 * beside it. On hover, focus or press the capsule widens to fill the pill, the
 * label slides away and a phone glyph arrives in the middle.
 *
 * WHERE: the landing page, the for-agents, for-hosts and for-landlords doors, and
 * the concierge or support call-to-action. NOT inside the product, where the
 * button system in north star 5A governs (one primary per screen, radius 14).
 * That is why this lives with the library but is imported only by marketing
 * routes; a review that finds it under `app/(app)` rejects it.
 *
 * CSS, NOT framer-motion. The original sprang three layers with framer. A hover
 * is a known track with a known end, so by the platform's split it is CSS: the
 * capsule widens with a `clip-path` inset (paint only, no layout) on
 * `--nf-ease-spring` over `--nf-duration-slow`, and the two layers cross on
 * `--nf-ease-standard`. The same states fire on `:focus-visible` and `:active`,
 * so a keyboard and a thumb get the whole effect, and hover alone never gates
 * anything. Reduced motion and the app's Calm and Off levels make the change
 * instant.
 *
 * SHAPE. Radius is `--nf-radius-2xl` (32), which on a 64px pill is a full
 * capsule: an Island radius, not the 999 reserved for chips. The label is the
 * caller's (`children`), with no default, and is the control's accessible name;
 * the visible copy and the arrow and phone glyphs are decorative. Renders a link
 * when given `href`, a button otherwise. The icons are `UiIcon`.
 */
type Common = { children: string; className?: string };

export type BookCallButtonProps =
  | (Common & { href: string; onClick?: never } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className" | "onClick">)
  | (Common & { href?: undefined; onClick: () => void } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className" | "onClick">);

function Layers({ label }: { label: string }) {
  return (
    <>
      <span className="nf-callcap__capsule" aria-hidden="true" />
      <span className="nf-callcap__rest" aria-hidden="true">
        <span className="nf-callcap__lead">
          <UiIcon name="arrow-right" size={28} />
        </span>
        <span className="nf-callcap__label">{label}</span>
      </span>
      <span className="nf-callcap__call" aria-hidden="true">
        <UiIcon name="phone" size={32} />
      </span>
      <span className="sr-only">{label}</span>
    </>
  );
}

export function BookCallButton(props: BookCallButtonProps) {
  const { children, className, href, onClick, ...rest } = props;
  if (href) {
    return (
      <Link href={href} className={cn("nf-callcap", className)}>
        <Layers label={children} />
      </Link>
    );
  }
  return (
    <button {...rest} type="button" onClick={onClick} className={cn("nf-callcap", className)}>
      <Layers label={children} />
    </button>
  );
}
