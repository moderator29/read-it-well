import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { HostShell } from "@/components/host/HostShell";
import { StaysDoors } from "@/components/host/StaysDoors";

/**
 * The three stays doors, `GOVERNING-09` screen three.
 *
 * Read here against the render at 390 in dark: the three rows on their lit
 * plates with the glass mark, the operator's own words, the single supporting
 * line and the chevron, and the calm explanatory panel with its small round
 * glyph under them. Every row is a rounded rectangle at 18px on a 64px plate,
 * which is a ratio of 0.28; the render's softer ends are the mistake the
 * shape law translates.
 */
export const dynamic = "force-dynamic";

export default async function PreviewC2StaysDoors() {
  const t = getDictionary(await getLocale());
  return (
    <HostShell logoLabel={t.a11y.logoHome} fallback="/host">
      <StaysDoors />
    </HostShell>
  );
}
