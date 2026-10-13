import { Skeleton } from "@/components/ui/Skeleton";
import "@/app/css/space-card.css";

/**
 * THE SPACE CARD'S WAIT: the same outer card, the same inset photo and the
 * same separate info panel, in slabs. The title and the price sit on one row
 * as they do on the real card, then the place and the facts line, so a card
 * that arrives does not change shape under the eye. Server-safe, hidden from
 * assistive technology (the section that holds it announces the wait).
 */
export function SpaceCardSkeleton({ variant = "card" }: { variant?: "card" | "compact" }) {
  return (
    <div aria-hidden="true" className={`nf-sc nf-sc--${variant} nf-sc--skeleton`}>
      <div className="nf-sc__media">
        <Skeleton className="h-full w-full" radius="none" />
      </div>
      <div className="nf-sc__info">
        <div className="nf-sc__head">
          <Skeleton width="55%" height="1rem" radius="xs" />
          <Skeleton width={variant === "compact" ? "35%" : "28%"} height="1.25rem" radius="xs" />
        </div>
        <Skeleton width="40%" height="0.75rem" radius="xs" />
        <Skeleton width="70%" height="0.75rem" radius="xs" />
      </div>
    </div>
  );
}
