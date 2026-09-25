/**
 * One key per mounted money form.
 *
 * The fund schemas are taking an optional `idempotencyKey` (backend worker
 * BC), so a double tap on a slow connection becomes one movement rather
 * than two. The form mints the key once when it mounts and posts it as a
 * hidden field on every submit of that mount; until the schema reads it the
 * field is simply ignored, which is why it can ship ahead.
 *
 * `crypto.randomUUID` needs a secure context. Every real page here is one,
 * and the fallback below exists so a plain-http preview never throws.
 */
export function mintIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const time = Date.now().toString(16);
  const noise = Math.floor(Math.random() * 0xffffffff).toString(16);
  return `${time}-${noise}`;
}
