/**
 * Neighbouring text is ONE label. JSX hands `Take down ({n})` to a button as
 * three text children, and as three flex items the button's gap printed it
 * "Take down ( 1 )". Strings and numbers that sit next to each other are
 * joined; anything else (an icon, an element) stays its own item.
 */
export function joinTextParts<T>(parts: readonly (T | string | number)[]): (T | string)[] {
  const out: (T | string)[] = [];
  for (const part of parts) {
    const last = out[out.length - 1];
    const isText = typeof part === "string" || typeof part === "number";
    if (isText && out.length > 0 && typeof last === "string") out[out.length - 1] = `${last}${part}`;
    else out.push(isText ? String(part) : (part as T));
  }
  return out;
}
