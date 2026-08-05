import Link from "next/link";
import { GroupCard } from "@/components/app/account/SettingsGroups";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * The settings row that owns where somebody is and what they do.
 *
 * A row, not a form. The three fields need a searchable picker each and their
 * own screen to breathe in, and repeating them here would give the platform two
 * places to change one answer. The row reads back what is stored, so it is
 * never a label that says nothing.
 */
export function PlaceCard({
  signedIn,
  stateName,
  lgaName,
  occupationName,
}: {
  signedIn: boolean;
  stateName: string;
  lgaName: string;
  occupationName: string;
}) {
  const place = [lgaName, stateName].filter(Boolean).join(", ");

  return (
    <GroupCard overline="Where you are" icon="globe-pin">
      <Link
        href={signedIn ? "/settings/place" : "/sign-in"}
        className="flex items-center gap-3 py-1 text-left"
        data-testid="settings-place-row"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[0.9375rem] font-medium">
            {place || "Nigeria"}
          </span>
          <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
            {signedIn
              ? place
                ? "Your state and local government. This is the city home opens on."
                : "Not set yet. Choose your state and local government."
              : "Sign in to keep your state and local government with your account."}
          </span>
        </span>
        <UiIcon
          name="chevron-down"
          size={16}
          className="shrink-0 -rotate-90 text-[var(--nf-content-muted)]"
        />
      </Link>

      <div className="mt-3 border-t border-[var(--nf-border-subtle)] pt-3">
        <Link
          href={signedIn ? "/settings/place" : "/sign-in"}
          className="flex items-center gap-3 py-1 text-left"
          data-testid="settings-occupation-row"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[0.9375rem] font-medium">
              {occupationName || "What you do"}
            </span>
            <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
              {occupationName
                ? "Chosen from the platform's list, so it can be searched on."
                : "Chosen from a list of 749, grouped by field."}
            </span>
          </span>
          <UiIcon
            name="chevron-down"
            size={16}
            className="shrink-0 -rotate-90 text-[var(--nf-content-muted)]"
          />
        </Link>
      </div>
    </GroupCard>
  );
}
