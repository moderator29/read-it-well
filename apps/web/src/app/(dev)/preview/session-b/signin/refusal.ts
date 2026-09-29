"use server";

import type { AuthFormState } from "@/lib/auth/form-state";

/** The preview's stand-in for `signInWithEmail`: it always refuses, with the
    real sentence `authMessage` gives for bad credentials. Never signs in. */
export async function fixtureRefusal(): Promise<AuthFormState> {
  return {
    ok: false,
    message: "That email and password do not match. Check both, or reset your password.",
  };
}
