import type { Dictionary } from "@vallo/i18n/core";
import { EmptyState } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { RetryInPlace } from "@/components/ui/RetryInPlace";
import type { RewardsRead } from "@/lib/referral/rewards";

type Copy = Dictionary["experienceRewards"]["states"];

/**
 * WHAT EVERY REWARDS ROUTE DRAWS WHEN THERE IS NO SNAPSHOT, so no route
 * invents a zero balance (a null never looks like nothing earned).
 *
 *   not-live    the referral engine does not exist yet: say there is no
 *               balance to show and hand the member to the invite link,
 *               which does work today
 *   signed-out  sign in, and come back here
 *   failed      said plainly, with a retry that keeps the page
 *
 * Server-safe.
 */
export function RewardsState({
  read,
  copy,
  signInHref,
  inviteHref,
}: {
  read: Exclude<RewardsRead, { state: "ready" }>;
  copy: Copy;
  signInHref: string;
  inviteHref: string;
}) {
  if (read.state === "signed-out") {
    return (
      <EmptyState
        icon="gift"
        art="gift"
        title={copy.signedOutTitle}
        body={copy.signedOutBody}
        action={
          <ButtonLink href={signInHref} variant="primary" size="lg">
            {copy.signIn}
          </ButtonLink>
        }
        data-testid="rewards-signed-out"
      />
    );
  }
  if (read.state === "failed") {
    return (
      <EmptyState
        icon="gift"
        art={false}
        title={copy.failedTitle}
        body={copy.failedBody}
        action={<RetryInPlace />}
        data-testid="rewards-failed"
      />
    );
  }
  return (
    <EmptyState
      icon="gift"
      art="gift"
      title={copy.notLiveTitle}
      body={copy.notLiveBody}
      action={
        <ButtonLink href={inviteHref} variant="secondary" size="lg">
          {copy.notLiveAction}
        </ButtonLink>
      }
      data-testid="rewards-not-live"
    />
  );
}
