import type { Metadata } from "next";
import { BackButton } from "@/components/site/BackButton";
import { parentOf } from "@/lib/nav/resolve";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { FirmRegisterForm } from "@/components/supply/FirmRegisterForm";

/* Back to the declared parent (`route-parents.ts`): this route declared one and drew no control, so Android back closed the app. */
const BACK = parentOf("/profile/setup/firm");

export const metadata: Metadata = {
  title: "Register a firm",
  robots: { index: false, follow: false },
};

/**
 * THE FIRM'S DOOR, `GOVERNING-05`, four screens.
 *
 * A firm is not a third person role. Its proof set is a SUPERSET of an
 * individual agent's, and a superset is a branch inside a form: `firm` is a
 * WORKSPACE kind and `SUPPLY_ROLES` still has two values. This route is that
 * branch, given its own address so the chooser can open it directly rather
 * than asking the same question a second time one screen later.
 *
 * A static segment beside `[role]`, like the owner's and the agent's, so the
 * professional application is untouched.
 */
export default async function FirmRegistrationPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <>
      <div className="pb-sm">
        <BackButton fallback={BACK.kind === "parent" ? BACK.href : "/profile"} />
      </div>
      <FirmRegisterForm t={t} />
    </>
  );
}
