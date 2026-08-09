import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/PageHeader";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ICON, TYPE } from "@/components/app/Screen";
import { ROLE_COPY, SETUP_ROLES } from "@/components/roles/roles";

export const metadata: Metadata = { title: "Start listing" };

/**
 * The chooser that "Become an agent" leads to.
 *
 * WHY THIS PAGE EXISTS AT ALL. The two setup flows, `/profile/setup/owner` and
 * `/profile/setup/professional`, were already built and already good. What was
 * missing was any way to reach them that a person would find: the only door
 * was a switch-profile sheet behind an avatar, which is the least discoverable
 * control on the platform, guarding the single most important thing anybody
 * can do here. A marketplace with no supply has exactly one conversion that
 * matters and it was two taps inside a sheet nobody opens.
 *
 * WHY IT IS UNDER `/profile` AND NOT `/agent`. Everything under `/agent` is
 * role gated, and the entire audience for this page is people who do not have
 * that role yet. Putting the front door of a flow inside the room it leads to
 * is how you build a page nobody can open.
 *
 * WHY IT ASKS RATHER THAN GUESSES. A landlord with one flat and an agency
 * managing a book of properties need different evidence: proof the property is
 * yours in the first case, business registration in the second. Picking for
 * somebody and making them back out is worse than one honest question, so each
 * card states what the role is, what it involves and exactly what will be
 * asked for, before anybody starts a form.
 */
export default function ProfileSetupPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Start listing on RentMe" />

      <p className={`mt-block max-w-[52ch] ${TYPE.body}`}>
        Both of these let you put property on RentMe and take enquiries. Pick
        the one that describes you, and we will tell you what is needed before
        you start.
      </p>

      <div className="mt-heading grid gap-group">
        {SETUP_ROLES.map((role) => {
          const copy = ROLE_COPY[role];
          return (
            <Link
              key={role}
              href={copy.setup.actionHref}
              className="nf-card block p-card transition-colors hover:border-[var(--nf-border-brand)]"
            >
              <span className="flex items-start gap-group">
                <span className="nf-icon-well shrink-0">
                  <UiIcon name={copy.icon} size={ICON.row} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block ${TYPE.rowTitle}`}>{copy.setup.title}</span>
                  <span className={`mt-inline-tight block ${TYPE.rowMeta}`}>{copy.setup.what}</span>

                  {/*
                    What will be asked for, listed before the form rather than
                    discovered inside it. Somebody who does not have their NIN
                    to hand should learn that here, not on step three.
                  */}
                  {copy.setup.needs && copy.setup.needs.length > 0 ? (
                  <span className="mt-block block">
                    <span className="nf-group-label">What you will need</span>
                    <span className="mt-inline-tight flex flex-wrap gap-inline">
                      {copy.setup.needs.map((need) => (
                        <span
                          key={need.label}
                          className="nf-chip nf-chip--quiet inline-flex items-center gap-inline-tight"
                        >
                          <UiIcon name={need.icon} size={ICON.inline} />
                          {need.label}
                        </span>
                      ))}
                    </span>
                  </span>
                  ) : null}
                </span>
                <UiIcon
                  name="chevron-right"
                  size={ICON.row}
                  className="mt-3xs shrink-0 text-[var(--nf-content-muted)]"
                />
              </span>
            </Link>
          );
        })}
      </div>

      {/*
        The honest sentence about timing, said once and not repeated inside the
        forms. "Verified" on this platform is a ladder somebody climbs, not a
        switch flipped at signup, and saying so here stops the badge's absence
        later reading as a fault.
      */}
      <p className={`mt-heading max-w-[52ch] ${TYPE.rowMeta}`}>
        You can start listing as soon as your profile is set up. The verified
        mark appears on your listings once a person here has checked your
        documents, which usually takes about two working days.
      </p>
    </div>
  );
}
