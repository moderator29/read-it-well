import { UiIcon } from "@/design-system/icons/UiIcon";
import { IconPlate } from "@/components/ui/IconPlate";

/**
 * ONE PAGE PER SETTING, WITH ITS EXPLANATION (directive D25, north star 16.6).
 *
 * A settings screen used to open on its controls and leave the reader to
 * infer what they did and who could see the result. This is the explanation,
 * one object on every settings page: what the page does, and who sees what is
 * on it. It is a Plate (radius 14, one hairline, no shadow, no glow), so it
 * reads as part of the page and never competes with the controls under it.
 *
 * The words are the caller's, from `experienceAccount.settings.lede`, and each
 * says only what the code can prove. Server-safe: nothing here holds state.
 */
export function SettingsLede({
  label,
  what,
  who,
  testId,
}: {
  /** The accessible name of the note ("What this page does"). */
  label: string;
  what: string;
  /** Who sees what is on the page. Omitted where the page has no audience. */
  who?: string;
  testId?: string;
}) {
  return (
    <aside className="nf-sett-lede" aria-label={label} data-testid={testId ?? "settings-lede"}>
      <IconPlate shape="round" size="sm" tone="brand">
        <UiIcon name="info" size={20} />
      </IconPlate>
      <div className="nf-sett-lede__text">
        <p className="nf-sett-lede__what">{what}</p>
        {who ? <p className="nf-sett-lede__who">{who}</p> : null}
      </div>
    </aside>
  );
}
