import { headers } from "next/headers";

import { surfaceFromUserAgent, type SignInSurface } from "./providers";

/** Which surface this request came from: the website or a native shell. */
export async function requestSurface(): Promise<SignInSurface> {
  return surfaceFromUserAgent((await headers()).get("user-agent"));
}
