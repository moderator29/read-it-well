"use client";

import { useEffect } from "react";
import { autoEnterKeyHint, isTextEntry, nextField } from "@/lib/ui/form-keys";

/**
 * THE KEYBOARD'S RETURN KEY SAYS WHAT IT WILL DO (details pass).
 *
 * 261 of the platform's text fields named no `enterKeyHint`, so a phone's
 * keyboard showed a bare "return" on every one of them, and pressing it in the
 * first field of a sign-up form submitted the form half filled. This fills
 * the gap once, for every field that did not choose for itself:
 *
 *   - a search field says "search";
 *   - a field with another field after it in the same form says "next", and
 *     return MOVES to that field rather than submitting;
 *   - the last field of a form says "done" and submits as it always did.
 *
 * A field that names its own `enterKeyHint` is never touched. The hint is
 * written on focus, which is when the keyboard reads it. Mounted once in the
 * root layout; renders nothing.
 */
export function FormKeys() {
  useEffect(() => {
    const onFocus = (event: FocusEvent) => {
      const el = event.target;
      if (!isTextEntry(el)) return;
      if (el.hasAttribute("enterkeyhint") && !el.hasAttribute("data-nf-ekh")) return;
      const hint = autoEnterKeyHint(el);
      if (!hint) return;
      el.setAttribute("enterkeyhint", hint);
      el.setAttribute("data-nf-ekh", hint);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.isComposing || event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) return;
      const el = event.target;
      if (!(el instanceof HTMLInputElement) || el.getAttribute("data-nf-ekh") !== "next") return;
      const next = nextField(el);
      if (!next) return;
      event.preventDefault();
      next.focus();
    };
    document.addEventListener("focusin", onFocus);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  return null;
}
