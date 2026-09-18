import Image from "next/image";

/**
 * A coin's image from the feed, or the symbol on the glass plate when the
 * feed sends none or the image fails.
 *
 * `unoptimized`, for now and on purpose: `next/image` throws at render on a
 * host it was not told about, and the coin images live on CoinGecko's
 * asset hosts, which are not in `next.config.ts` (a lead-owned file). An
 * unlisted host through the optimiser would take the whole market page
 * down; unoptimised, the browser fetches the 64px PNG the feed already
 * sized. The remote pattern request is in worker E's report; when it lands,
 * the flag comes off here and nothing else changes.
 */
export function CoinImage({
  src,
  symbol,
  name,
  size = "md",
}: {
  src: string;
  symbol: string;
  name: string;
  size?: "md" | "lg";
}) {
  const px = size === "lg" ? 56 : 40;
  const safe = src.startsWith("https://") ? src : "";
  return (
    <span className={`nf-coin-img ${size === "lg" ? "nf-coin-img--lg" : ""}`} aria-hidden="true">
      {safe ? (
        <Image src={safe} alt="" width={px} height={px} unoptimized />
      ) : (
        <span className="nf-coin-img__fallback">{symbol.slice(0, 4).toUpperCase()}</span>
      )}
      <span className="sr-only">{name}</span>
    </span>
  );
}
