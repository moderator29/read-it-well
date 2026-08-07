import { headers } from "next/headers";

/**
 * The platform's own public URL.
 *
 * Auth redirects and email links must be absolute, and they must point at the
 * deployment the person is actually using. `NEXT_PUBLIC_SITE_URL` is the answer
 * when set; on Vercel the platform injects `VERCEL_PROJECT_PRODUCTION_URL` for
 * the production domain and `VERCEL_URL` for a preview build; and local
 * development falls back to the dev port. Never returns a trailing slash, so
 * callers can concatenate a path safely.
 *
 * Use `authOrigin()` below for anything a browser will be sent back to. This
 * one is for contexts with no request to read, such as an email rendered from
 * a webhook.
 */
export function siteUrl(): string {
  const explicit = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  if (explicit.length > 0) return explicit.replace(/\/+$/, "");

  const production = (process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "").trim();
  if (production.length > 0) return `https://${production.replace(/\/+$/, "")}`;

  const vercel = (process.env.VERCEL_URL ?? "").trim();
  if (vercel.length > 0) return `https://${vercel.replace(/\/+$/, "")}`;

  return "http://localhost:3210";
}

/**
 * Where to send a browser back to, taken from the request it is making.
 *
 * THIS EXISTS BECAUSE A REAL SIGN-UP LANDED ON `localhost`. A Google sign-up
 * from a phone completed, the account was created and confirmed, and then the
 * browser was sent to `http://localhost:3000`, which a phone cannot reach. The
 * account was fine. The address was not.
 *
 * An environment variable is the wrong instrument for this. It has to be set
 * correctly, on every environment, by hand, and when it is wrong nothing fails
 * until somebody is standing at the door with a confirmed account and no way
 * in. The host the reader is ON is not a configuration question: it is in the
 * request, and on Vercel it arrives as `x-forwarded-host` with the scheme
 * beside it in `x-forwarded-proto`.
 *
 * The env chain stays as the fallback for a context with no request, and
 * localhost is still the right answer when the request really is from
 * localhost.
 *
 * Only the host and scheme are used, never a path, so nothing a caller sends
 * can steer this. A forged `x-forwarded-host` on a platform that sets it is
 * not reachable: Vercel overwrites the header at the edge.
 */
export async function authOrigin(): Promise<string> {
  try {
    const store = await headers();
    const host = (store.get("x-forwarded-host") ?? store.get("host") ?? "").trim();
    if (host.length > 0) {
      const forwarded = (store.get("x-forwarded-proto") ?? "").split(",")[0]?.trim() ?? "";
      const scheme =
        forwarded.length > 0 ? forwarded : /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host) ? "http" : "https";
      return `${scheme}://${host}`;
    }
  } catch {
    /* No request in scope. The env chain below is the answer there. */
  }
  return siteUrl();
}
