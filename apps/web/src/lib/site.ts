/**
 * The platform's own public URL.
 *
 * Auth redirects and email links must be absolute, and they must point at the
 * deployment the person is actually using. NEXT_PUBLIC_SITE_URL is the answer
 * when set; on Vercel the platform injects VERCEL_URL for preview builds, which
 * is what makes an OAuth round trip work on a preview deployment; and local
 * development falls back to the dev port. Never returns a trailing slash, so
 * callers can concatenate a path safely.
 */
export function siteUrl(): string {
  const explicit = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  if (explicit.length > 0) return explicit.replace(/\/+$/, "");

  const vercel = (process.env.VERCEL_URL ?? "").trim();
  if (vercel.length > 0) return `https://${vercel.replace(/\/+$/, "")}`;

  return "http://localhost:3210";
}
