"use client";

import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { TYPE } from "@/components/app/Screen";
import { LANGUAGES, TONES, type Language, type Tone } from "./AssistantSidebar";

/**
 * The assistant's settings, behind one row at the foot of the sidebar.
 *
 * ---------------------------------------------------------------------------
 * WHY THEY LEFT THE SIDEBAR ITSELF.
 *
 * Reply style, language and clear-all were all splayed open under the
 * conversation history, permanently. Three controls, a heading each, taking
 * the bottom third of a column whose actual job is showing you which
 * conversation to return to - and on a phone-height drawer that is most of the
 * history gone.
 *
 * They are also settings, which is to say things somebody sets once and then
 * does not look at. Reply style in particular: a person picks Concise or
 * Detailed in their first week and never touches it again, and it was sitting
 * at eye level below every conversation they had ever had.
 *
 * One row at the foot, the way ChatGPT puts its account there, opening the lot
 * in a sheet. The history gets the space back.
 *
 * ---------------------------------------------------------------------------
 * LANGUAGE IS A LIST NOW AND IT WAS A CYCLE BUTTON.
 *
 * It read `Language: English` and each tap advanced to the next of five, so
 * reaching Yoruba from English was four taps past three languages you did not
 * want, and there was no way to see what the options WERE without pressing
 * through them. That is defensible in a cramped strip where a list does not
 * fit. In a sheet it is just worse, so it is five rows with the current one
 * marked.
 */
export function AssistantSettingsSheet({
  open,
  onOpenChange,
  tone,
  language,
  onToneChange,
  onLanguageChange,
  onClearAll,
  threadCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tone: Tone;
  language: Language;
  onToneChange: (tone: Tone) => void;
  onLanguageChange: (language: Language) => void;
  onClearAll: () => void;
  /** Drives the clear control's disabled state and its count. */
  threadCount: number;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Assistant settings">
      <div className="mx-auto w-full max-w-md space-y-block">
        <Group
          title="Reply style"
          hint="How much the assistant says. Concise answers the question; detailed explains the reasoning around it."
        >
          <div role="radiogroup" aria-label="Reply style" className="space-y-row">
            {TONES.map((option) => (
              <OptionRow
                key={option}
                label={option}
                detail={
                  option === "Concise"
                    ? "Short answers, straight to the listing."
                    : "Fuller answers, with the costs and caveats spelled out."
                }
                selected={tone === option}
                onSelect={() => onToneChange(option)}
              />
            ))}
          </div>
        </Group>

        <Group
          title="Language"
          hint="The language the assistant replies in. It understands all five whichever one is set."
        >
          <div role="radiogroup" aria-label="Language" className="space-y-row">
            {LANGUAGES.map((option) => (
              <OptionRow
                key={option}
                label={option}
                selected={language === option}
                onSelect={() => onLanguageChange(option)}
              />
            ))}
          </div>
        </Group>

        <Group
          title="History"
          hint="Your conversations are kept on this device only. Clearing them here does not leave a copy behind."
        >
          <Button
            variant="dangerQuiet"
            full
            onClick={onClearAll}
            disabled={threadCount === 0}
          >
            {threadCount === 0
              ? "No conversations to clear"
              : `Clear all ${threadCount} conversations`}
          </Button>
        </Group>
      </div>
    </Sheet>
  );
}

function Group({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="nf-overline">{title}</h3>
      <p className={`mt-inline-tight ${TYPE.rowMeta}`}>{hint}</p>
      <div className="mt-heading">{children}</div>
    </section>
  );
}

/**
 * One option, as a row rather than a chip.
 *
 * `role="radio"` INSIDE a `radiogroup` this time, which the chips at the foot
 * of the sidebar could not claim: they announced `aria-pressed` because there
 * was no group element around them and a radio without a group is invalid
 * ARIA. Here there is one, so the honest semantics are available and the
 * screen reader hears "1 of 5" rather than five separate toggles.
 */
function OptionRow({
  label,
  detail,
  selected,
  onSelect,
}: {
  label: string;
  detail?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`nf-tap flex w-full items-center gap-md rounded-[var(--nf-radius-control)] border px-3 py-2.5 text-left transition-colors ${
        selected
          ? "border-[color-mix(in_oklab,var(--nf-brand-primary)_55%,transparent)] bg-[color-mix(in_oklab,var(--nf-brand-primary)_16%,transparent)]"
          : "border-[var(--nf-border-subtle)] hover:bg-[var(--nf-glass-fill)]"
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className={`block ${TYPE.rowTitle}`}>{label}</span>
        {detail && <span className={`mt-inline-tight block ${TYPE.rowMeta}`}>{detail}</span>}
      </span>
      {/* A tick is the only selected marker that survives a colourblind
          reader; the tint alone is not a state. `verified` is the tick this
          icon set has - there is no bare `check` - and at 18px it reads as one
          rather than as a badge. */}
      {selected && (
        <UiIcon
          name="verified"
          size={18}
          className="shrink-0 text-[var(--nf-brand-secondary)]"
        />
      )}
    </button>
  );
}
