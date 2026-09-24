/**
 * Whether a request is a PREFETCH rather than somebody opening the page
 * (V-73 review). The router prefetches a link on hover, touch or when it
 * scrolls into view, and a browser may prefetch on its own; neither is a
 * person looking, so nothing that counts views may run for one.
 *
 *   next-router-prefetch: 1      the Next.js router's own prefetch
 *   purpose: prefetch            older browsers
 *   sec-purpose: prefetch;...    current browsers (may carry ";prerender")
 */
export function isPrefetchRequest(get: (name: string) => string | null): boolean {
  if (get("next-router-prefetch")) return true;
  const purpose = (get("sec-purpose") ?? get("purpose") ?? "").toLowerCase();
  return purpose.split(/[;,\s]+/).includes("prefetch");
}
