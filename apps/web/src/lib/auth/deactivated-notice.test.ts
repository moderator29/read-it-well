import { describe, expect, it } from "vitest";
import {
  deactivatedAccountNotice,
  isDeactivatedAccountError,
  RESTORE_HREF,
} from "./deactivated-notice";
import { GRACE_WINDOW_DAYS } from "@/lib/account-deletion/constants";

/**
 * The door during the deletion grace window.
 *
 * The matcher is the fragile half, because it reads an upstream error string
 * this repository does not own. When it stops matching nothing fails: the
 * branch goes quiet and GoTrue's own word, "banned", lands on the screen of
 * somebody who merely asked to close their account. These cases are what
 * turns that silence into a failure.
 */

describe("isDeactivatedAccountError", () => {
  it("recognises the message GoTrue actually sends", () => {
    expect(isDeactivatedAccountError("User is banned")).toBe(true);
  });

  it("recognises it whatever case the wording arrives in", () => {
    expect(isDeactivatedAccountError("USER IS BANNED")).toBe(true);
    expect(isDeactivatedAccountError("user_banned")).toBe(true);
    expect(isDeactivatedAccountError("This user is banned until later")).toBe(true);
  });

  /*
   * The other branches of `authMessage` must keep reaching their own
   * sentences. A deactivated notice shown to somebody who simply mistyped a
   * password would tell them their account is being deleted, which is worse
   * than the raw message this replaced.
   */
  it("leaves every other auth refusal alone", () => {
    for (const other of [
      "Invalid login credentials",
      "Email not confirmed",
      "User already registered",
      "Request rate limit reached",
      "Password should be at least 6 characters",
      "",
    ]) {
      expect(isDeactivatedAccountError(other)).toBe(false);
    }
  });
});

describe("deactivatedAccountNotice", () => {
  it("names what happened rather than the mechanism", () => {
    const { message } = deactivatedAccountNotice();
    expect(message).toContain("deactivated");
    /* Banned is what the auth layer does, not what the person asked for, and
       reading it here would land as a punishment for closing an account. */
    expect(message.toLowerCase()).not.toContain("banned");
  });

  it("states the window from the one constant that defines it", () => {
    expect(deactivatedAccountNotice().message).toContain(`${GRACE_WINDOW_DAYS} days`);
  });

  it("points at the form that takes the restore code, not merely at the page", () => {
    expect(deactivatedAccountNotice().action.href).toBe(RESTORE_HREF);
    expect(RESTORE_HREF).toBe("/delete-account#restore");
  });

  it("offers exactly one way out", () => {
    const notice = deactivatedAccountNotice();
    expect(notice.action.label.length).toBeGreaterThan(0);
    expect(Object.keys(notice)).toEqual(["message", "action"]);
  });
});
