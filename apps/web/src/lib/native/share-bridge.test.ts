import { describe, expect, it, vi } from "vitest";

import { webShareOver } from "./share-bridge";

describe("navigator.share in the Android shell keeps the Web Share contract", () => {
  it("hands title, text and url to the plugin and resolves", async () => {
    const share = vi.fn().mockResolvedValue({});
    await webShareOver({ share })({ title: "A flat", url: "https://www.vallospaces.com/listing/x" });
    expect(share).toHaveBeenCalledWith({
      title: "A flat",
      text: undefined,
      url: "https://www.vallospaces.com/listing/x",
      dialogTitle: "Share",
    });
  });

  it("rejects with AbortError when the sheet is dismissed, which callers treat as silence", async () => {
    const share = vi.fn().mockRejectedValue(new Error("Share canceled"));
    await expect(webShareOver({ share })({ url: "https://x.test" })).rejects.toMatchObject({ name: "AbortError" });
  });

  it("rejects with NotAllowedError on a real failure, so callers fall back to the clipboard", async () => {
    const share = vi.fn().mockRejectedValue(new Error("no activity"));
    await expect(webShareOver({ share })({ url: "https://x.test" })).rejects.toMatchObject({
      name: "NotAllowedError",
    });
  });

  it("refuses an empty share without calling the plugin", async () => {
    const share = vi.fn();
    await expect(webShareOver({ share })({})).rejects.toBeInstanceOf(TypeError);
    expect(share).not.toHaveBeenCalled();
  });
});
