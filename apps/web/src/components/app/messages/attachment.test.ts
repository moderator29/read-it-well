import { describe, expect, it } from "vitest";
import { attachmentKind, formatBytes } from "./attachment";

describe("attachmentKind", () => {
  it("reads the mime type first", () => {
    expect(attachmentKind("image/jpeg")).toBe("photo");
    expect(attachmentKind("audio/mp4")).toBe("voice");
    expect(attachmentKind("application/pdf")).toBe("pdf");
    expect(attachmentKind("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe("document");
  });
  it("falls back to the extension, then to a plain file", () => {
    expect(attachmentKind(null, "Tenancy agreement.PDF")).toBe("pdf");
    expect(attachmentKind(null, "rent-schedule.xlsx")).toBe("document");
    expect(attachmentKind("application/octet-stream", "blob.bin")).toBe("file");
    expect(attachmentKind(undefined, undefined)).toBe("file");
  });
});

describe("formatBytes", () => {
  it("writes sizes the way people read them", () => {
    expect(formatBytes(420)).toBe("420 B");
    expect(formatBytes(812_000)).toBe("812 KB");
    expect(formatBytes(1_400_000)).toBe("1.4 MB");
    expect(formatBytes(12_300_000)).toBe("12 MB");
  });
  it("says nothing when the size is not known", () => {
    expect(formatBytes(null)).toBeNull();
    expect(formatBytes(-5)).toBeNull();
  });
});
