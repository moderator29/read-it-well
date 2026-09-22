import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { listStates } from "@/lib/places/queries";
import { OwnerRegisterForm } from "@/components/supply/OwnerRegisterForm";

/**
 * The owner registration form, all four screens, for the shape proof.
 *
 * `/profile/setup/owner` sits behind the signed-in gate in `proxy.ts`, and the
 * proof server has no session, so this renders the SAME component on the same
 * shell width and a script walks it. Never the proof of the writes: the write
 * is proved by the migration probe and by `registration.test.ts`.
 *
 * THE STATES COME FROM THE REAL READ, AND THE FIXTURE IS THE FALLBACK RATHER
 * THAN THE SOURCE. Every Supabase origin is refused by this sandbox's egress
 * proxy, so `listStates()` returns an empty array here and the picker draws
 * its own honest empty state. That is correct behaviour and it is worth seeing
 * once, but a screen proof of a form whose two pickers can never be filled
 * proves only half the screen. So when and only when the read comes back
 * empty, four real Nigerian states stand in, so the picker, the dependent
 * local government field and the Continue control can all be walked.
 *
 * FIXTURE DATA LIVES HERE AND NOWHERE ELSE. Nothing in `/profile/setup/owner`
 * reads this file; the route hands the component whatever the database
 * returns, including nothing.
 */
export const dynamic = "force-dynamic";

export default async function PreviewOwnerForm({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const [{ step }, locale, states]: [
    { step?: string },
    Locale,
    Awaited<ReturnType<typeof listStates>>,
  ] = await Promise.all([searchParams, getLocale(), listStates()]);
  const t = getDictionary(locale);
  const rows =
    states.length > 0
      ? states
      : [
          { code: "LA", name: "Lagos" },
          { code: "FC", name: "Federal Capital Territory" },
          { code: "OY", name: "Oyo" },
          { code: "RI", name: "Rivers" },
        ];
  return (
    <div className="nf-shell py-section-tight">
      <OwnerRegisterForm t={t} states={rows} startAt={Number(step ?? 0) || 0} />
    </div>
  );
}
