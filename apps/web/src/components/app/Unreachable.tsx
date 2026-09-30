import { EmptyState } from "@/components/app/Screen";
import { EmptyActions } from "@/components/app/EmptyActions";
import { RetryInPlace } from "@/components/ui/RetryInPlace";
import type { BrandIconName } from "@/design-system/icons/BrandIcon";

/**
 * The screen a person meets when the platform cannot answer.
 *
 * ---------------------------------------------------------------------------
 * THIRTEEN SCREENS SAID SOMETHING "SWITCHES ON SHORTLY", WHICH IS "COMING
 * SOON" IN OTHER WORDS.
 *
 * "Notifications switch on shortly". "Payment switches on shortly".
 * "Messaging is nearly here... come back soon". "Accounts switch on shortly".
 * And nine more, several of them explaining that the state would resolve "the
 * moment the platform keys land", which is infrastructure jargon printed in
 * user copy on a payment screen.
 *
 * Two things are wrong with that, and the banned word is the smaller one.
 *
 * FIRST, IT IS A SCHEDULE NOBODY CAN KEEP. "Shortly" is a promise about a time
 * this product cannot name. `demo`, `sample`, `preview`, `not live` and
 * `coming soon` are banned in UI copy for a reason and "switches on shortly"
 * is the same sentence wearing a different coat.
 *
 * SECOND, AND WORSE: THIS IS NOT A PRE-LAUNCH STATE, IT IS A FAILURE STATE. A
 * real person hits this branch in production the moment a key lapses, a
 * network path breaks or a service is down. What they need to know is not when
 * a feature arrives. It is whether the fault is theirs, whether anything they
 * own has been lost, and whether their money has moved. All three answers fit
 * in one sentence and none of them was being given.
 *
 * So the copy describes the SITUATION and not a schedule. The noun is
 * parameterised, the assurance is the same everywhere because it is the same
 * assurance, and the reader is left with somewhere to go.
 */
export function Unreachable({
  /** The thing that cannot be reached, lower case: "wallet", "notifications". */
  noun,
  icon,
  /** Where a person can usefully go instead. Omitted where nowhere helps. */
  action,
  "data-testid": testId,
}: {
  noun: string;
  icon: BrandIconName;
  action?: { label: string; href: string };
  "data-testid"?: string;
}) {
  return (
    <EmptyState
      icon={icon}
      title={`We cannot reach your ${noun} right now`}
      body="This is on our side, not yours. Nothing has been lost and nothing has moved. Try again in a few minutes."
      /* Without a better place to send them, the one useful thing is to ask
         again, in place (details pass). */
      action={action ? <EmptyActions primary={action} /> : <RetryInPlace />}
      data-testid={testId}
    />
  );
}
