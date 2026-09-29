"use server";

import type { VerifyResult } from "@/lib/passcode/actions";

/** The preview's stand-in for `verifyPasscodeAction`: every code is wrong, with two tries left before the pause. Never unlocks. */
export async function fixtureWrongCode(): Promise<VerifyResult> {
  return { status: "wrong", beforeCooldown: 2, beforeSignOut: 7 };
}
