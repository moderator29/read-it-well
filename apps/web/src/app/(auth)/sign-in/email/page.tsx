import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FIRST_RUN_PASSED_PARAM } from "@/components/app/welcome/first-run-seen";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

/**
 * The old second step of the email-first door (B-1).
 *
 * Sign-in is one screen now: `/sign-in` draws the email and the password
 * together and reads the address this step used to read (`?email=`, or the
 * chooser's httpOnly cookie through `chooserEmail`). This address is kept so
 * links, bookmarks and the callback's "sign in" buttons that still point here
 * land on the same screen, with `next` and `email` carried and nothing else.
 */
export default async function SignInEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const carried = new URLSearchParams();
  for (const key of ["next", "email", "notice"] as const) {
    const value = params[key];
    if (typeof value === "string" && value.length > 0) carried.set(key, value);
  }
  /* A device sent on from here has been at the door already: first run is
     not put in front of it again (`first-run-gate.ts`). */
  if (carried.has("next")) carried.set(FIRST_RUN_PASSED_PARAM, "1");
  const query = carried.toString();
  redirect(`/sign-in${query ? `?${query}` : ""}`);
}
