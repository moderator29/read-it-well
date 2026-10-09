import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push() {}, replace() {}, refresh() {} }) }));
vi.mock("@/lib/messages/direct-actions", () => ({ sendDirectMessage: vi.fn() }));

import { DirectFirstMessage } from "./DirectFirstMessage";

const copy = { placeholder: "Write a message to Ada", hint: "They get a notification.", send: "Send", sending: "Sending" };

describe("DirectFirstMessage", () => {
  it("shows who is being written to, above the box", () => {
    const html = renderToStaticMarkup(<DirectFirstMessage handle="ada" name="Ada Eze" avatarUrl="" copy={copy} />);
    expect(html).toContain("Ada Eze");
    expect(html).toContain("@ada");
    expect(html).toContain('placeholder="Write a message to Ada"');
  });

  it("cannot send an empty message", () => {
    const html = renderToStaticMarkup(<DirectFirstMessage handle="ada" name="Ada Eze" avatarUrl="" copy={copy} />);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>/);
  });
});
