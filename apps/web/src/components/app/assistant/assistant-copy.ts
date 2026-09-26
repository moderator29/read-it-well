import type { Dictionary } from "@vallo/i18n/core";

/**
 * THE ASSISTANT'S WORDS, HANDED DOWN (Track M performance).
 *
 * `AssistantChat` is a client component that called `getDictionary`, which
 * shipped every word of all four languages to the assistant page for the
 * dozen lines it draws. The page now passes these, in the reader's language,
 * and the type means the chat cannot read a line that is not here.
 */
export type AssistantCopy = {
  home: Pick<Dictionary["home"], "assistant">;
  units: Pick<Dictionary["units"], "beds" | "baths">;
  catalogue: { card: Pick<Dictionary["catalogue"]["card"], "sqm"> };
  common: Pick<Dictionary["common"], "verified">;
};

export function assistantCopyOf(t: Dictionary): AssistantCopy {
  return {
    home: { assistant: t.home.assistant },
    units: { beds: t.units.beds, baths: t.units.baths },
    catalogue: { card: { sqm: t.catalogue.card.sqm } },
    common: { verified: t.common.verified },
  };
}
