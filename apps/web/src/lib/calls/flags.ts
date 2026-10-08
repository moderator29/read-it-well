import "server-only";

import { cache } from "react";
import { ADMIN_REVIEW_CALLS_FLAG, VIDEO_CALLS_FLAG, flagIsOn } from "../flags/read";

/**
 * The two VC1 switches, read once per request however many places draw a
 * call control (a thread header, five case desks, the shell's layer).
 * Fail-closed like `flagIsOn`: a failed read is "off", which draws no call
 * button and shows the calm "not available yet" on the call routes. The
 * database refuses every call function while a switch is off, whatever a
 * screen draws; these only decide what is drawn.
 */
export const videoCallsOn = cache(async (): Promise<boolean> => flagIsOn(VIDEO_CALLS_FLAG));

/** Review calls ride on the call infrastructure, so they need both switches. */
export const reviewCallsOn = cache(async (): Promise<boolean> => {
  const [calls, reviews] = await Promise.all([videoCallsOn(), flagIsOn(ADMIN_REVIEW_CALLS_FLAG)]);
  return calls && reviews;
});
