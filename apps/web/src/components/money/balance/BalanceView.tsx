import type { Locale } from "@vallo/i18n/core";
import type { BalanceRead } from "@/lib/money/member-wallet";
import { State } from "@/components/ui/State";
import { BalanceScreen } from "./BalanceScreen";
import { BalanceOnboarding } from "./BalanceOnboarding";
import "@/app/css/money-layer.css";

/**
 * Every signed-in state of /wallet, as one component the route draws with
 * the real read and the preview harness draws with fixture reads. The route
 * keeps the signed-out door itself (`withNext`, its own test).
 *
 * NOT CONNECTED IS THE WALLET ITSELF (the founder, 7 October: "Build the
 * front end and the wallet design, let me see it, even though the key is not
 * connected"). The same screen a connected member sees, with no figure in the
 * figure's place, every action present and disabled, one short line saying
 * why, and the activity's own empty state. No object, no glass, no paragraph
 * about partners or rails.
 */
export function BalanceView({ read, locale }: { read: Exclude<BalanceRead, { state: "signed-out" }>; locale: Locale }) {
  if (read.state === "not-live") {
    return <BalanceScreen figures={null} movements={[]} live={false} connected={false} reason={read.reason} locale={locale} now={0} />;
  }
  if (read.state === "onboarding") return <BalanceOnboarding state={read.onboarding} gaps={read.gaps} />;
  if (read.state === "error") {
    return (
      <div className="mt-block">
        <State
          kind="error"
          title="Your figures could not be read"
          body="Nothing has moved. Try again in a moment."
          primary={{ href: "/wallet", label: "Try again" }}
        />
      </div>
    );
  }
  return <BalanceScreen figures={read.figures} movements={read.movements} live={read.live} locale={locale} now={Date.parse(read.readAt)} />;
}
