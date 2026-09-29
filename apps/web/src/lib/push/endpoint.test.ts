import { describe, expect, it } from "vitest";
import { isAllowedWebPushEndpoint } from "./endpoint";

describe("isAllowedWebPushEndpoint", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/abc123",
    "https://updates.push.services.mozilla.com/wpush/v2/abc",
    "https://web.push.apple.com/QGx1",
    "https://wns2-par02p.notify.windows.com/w/?token=abc",
  ])("accepts the real push service %s", (url) => {
    expect(isAllowedWebPushEndpoint(url)).toBe(true);
  });

  it.each([
    "http://fcm.googleapis.com/fcm/send/abc",
    "https://169.254.169.254/latest/meta-data",
    "https://127.0.0.1/x",
    "https://localhost/x",
    "https://evil.example/fcm.googleapis.com",
    "https://fcm.googleapis.com.evil.example/x",
    "https://notify.windows.com/x",
    "https://evilnotify.windows.com/x",
    "https://fcm.googleapis.com:8443/x",
    "https://user:pass@fcm.googleapis.com/x",
    "file:///etc/passwd",
    "not a url",
  ])("refuses %s", (url) => {
    expect(isAllowedWebPushEndpoint(url)).toBe(false);
  });
});
