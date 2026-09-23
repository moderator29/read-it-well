import { describe, expect, it } from "vitest";

import config from "../../../capacitor.config";
import { NATIVE_UA_TOKEN, surfaceFromUserAgent } from "./providers";

describe("the shell announces itself with the token the server reads", () => {
  it("capacitor.config appends exactly NATIVE_UA_TOKEN", () => {
    expect(config.appendUserAgent).toBe(NATIVE_UA_TOKEN);
    expect(surfaceFromUserAgent(`Mozilla/5.0 (iPhone) ${config.appendUserAgent}`)).toBe("ios-native");
  });
});
