import type { ShareLines } from "@/lib/price-check/share-card";
import { countFill } from "@/lib/ui/meter";
import { ShareCardFrame } from "./ShareCardFrame";

/**
 * A PRICE CHECK AREA CARD, ON SCREEN: the same card the unfurl image draws
 * (`og-share-card.tsx`), so the page a forwarded link opens and the picture
 * that was forwarded agree line for line.
 *
 * The headline, the range as the figure (low and high at one size; the
 * midpoint is not drawn at all), one meter bar per listing the range came
 * from with the count as its word, the basis as the honest line, and the
 * standing footer. It takes `ShareLines` and nothing else, and `ShareLines`
 * has no field for an address.
 */
export function AreaShareCard({
  lines,
  chip,
  testId,
}: {
  lines: ShareLines;
  chip: string;
  testId?: string;
}) {
  return (
    <ShareCardFrame
      testId={testId}
      title={lines.headline}
      chip={{ label: chip }}
      figure={lines.range}
      figureSize="lg"
      meter={{ filled: countFill(lines.count), word: lines.meterWord }}
      checks={[{ tone: "success", label: lines.basis }]}
      honest={lines.footer}
    />
  );
}
