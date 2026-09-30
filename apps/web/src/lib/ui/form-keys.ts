/**
 * What the keyboard's return key should say and do, for a field that did not
 * choose (details pass; `components/ui/FormKeys.tsx` applies it).
 */
const TEXT_TYPES = new Set(["text", "search", "email", "tel", "url", "number", "password", ""]);

export function isTextEntry(el: EventTarget | null): el is HTMLInputElement {
  return (
    typeof HTMLInputElement !== "undefined" &&
    el instanceof HTMLInputElement &&
    TEXT_TYPES.has((el.getAttribute("type") ?? "").toLowerCase())
  );
}

function usable(el: Element): el is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  if (el instanceof HTMLInputElement) {
    if (!TEXT_TYPES.has((el.getAttribute("type") ?? "").toLowerCase())) return false;
  } else if (!(el instanceof HTMLSelectElement) && !(el instanceof HTMLTextAreaElement)) {
    return false;
  }
  if (el.disabled || (el as HTMLInputElement).readOnly) return false;
  if (el.closest("[hidden], [inert], [aria-hidden='true']")) return false;
  return true;
}

/** The field after this one in its form, or null when it is the last. */
export function nextField(el: HTMLInputElement): HTMLElement | null {
  const form = el.form;
  if (!form) return null;
  const fields = Array.from(form.elements).filter(usable);
  const at = fields.indexOf(el);
  return at >= 0 && at < fields.length - 1 ? fields[at + 1]! : null;
}

export type AutoHint = "search" | "next" | "done" | null;

/** The rule, pure: search says search; in a form, next until the last field. */
export function hintFor(field: { search: boolean; inForm: boolean; hasNext: boolean }): AutoHint {
  if (field.search) return "search";
  if (!field.inForm) return null;
  return field.hasNext ? "next" : "done";
}

/** "search", "next" or "done"; null outside a form, where it is left alone. */
export function autoEnterKeyHint(el: HTMLInputElement): AutoHint {
  return hintFor({
    search: (el.getAttribute("type") ?? "").toLowerCase() === "search" || el.getAttribute("role") === "searchbox",
    inForm: el.form !== null,
    hasNext: nextField(el) !== null,
  });
}
