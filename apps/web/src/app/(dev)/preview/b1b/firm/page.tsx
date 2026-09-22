import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { FirmRegisterForm } from "@/components/supply/FirmRegisterForm";

/**
 * The firm registration form, all four screens, for the shape proof.
 * `/profile/setup/firm` is behind the signed-in gate and the proof server has
 * no session, so this renders the same component on the same shell width.
 */
export const dynamic = "force-dynamic";

export default async function PreviewFirmForm({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const [{ step }, locale]: [{ step?: string }, Locale] = await Promise.all([
    searchParams,
    getLocale(),
  ]);
  const t = getDictionary(locale);
  return (
    <div className="nf-shell py-section-tight">
      <FirmRegisterForm t={t} startAt={Number(step ?? 0) || 0} />
    </div>
  );
}
