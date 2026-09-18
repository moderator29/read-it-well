import { getDictionary } from "@vallo/i18n";
import { PaymentMethodsSlot } from "@/components/app/account/PaymentMethodsSlot";
import { LogOutRow, SettingsHub } from "@/app/(app)/settings/SettingsHub";
import { PERSON } from "../../_fixtures/people";

/**
 * The settings home as a signed-in person sees it, from fixtures, for the
 * side-by-side with `7F96BE6C`. The payment methods block shows the slot as
 * F4 leaves it for worker E.
 */
export default function SettingsPreview() {
  const t = getDictionary("en");
  const hub = t.settings.hub;
  return (
    <div className="nf-shell pt-xl">
      <div className="mx-auto max-w-2xl">
        <header className="nf-hub-head">
          <h1 className="nf-hub-head__title">{t.nav.settings}</h1>
          <p className="nf-hub-head__lede">{hub.lede}</p>
        </header>
        <div className="space-y-block">
          <SettingsHub
            t={t}
            locale="en"
            signedIn
            person={{
              name: PERSON.name,
              email: "seyi@example.com",
              avatarUrl: PERSON.avatarUrl,
              verified: PERSON.verified,
            }}
            notifications={{ bookings: true, messages: true, wallet: true, marketing: false }}
            deviceCount={2}
          />
          <PaymentMethodsSlot
            title={hub.payments}
            sub={hub.paymentsSub}
            addLabel={hub.add}
            manageLabel={t.paymentsPage.settingsRow}
          />
          <LogOutRow t={t} signedIn />
        </div>
      </div>
    </div>
  );
}
