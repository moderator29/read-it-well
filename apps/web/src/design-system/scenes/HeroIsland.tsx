import Image from "next/image";

/**
 * The hero object: the supplied NaijaFinds island render.
 *
 * This is the owner's artwork, cut from the supplied sheet with its alpha
 * preserved. The label chips that were baked into the render have been removed,
 * for two reasons: their text was garbled by the export, and they carried
 * invented inventory counts. Live chips are composed over the render instead,
 * so the numbers can come from the platform when the endpoint exists rather
 * than being painted on (Master Rule 8).
 */
export function HeroIsland({
  className,
  priority,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/island.png"
      alt="An illustrated island city of towers, homes, palm trees and water"
      width={547}
      height={495}
      priority={priority}
      className={className}
      sizes="(max-width: 1024px) 90vw, 640px"
      style={{ width: "100%", height: "auto" }}
    />
  );
}
