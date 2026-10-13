import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { ClientCopyProvider } from "@/lib/i18n/client-copy";
import { clientCopyOf } from "@/lib/i18n/client-copy-of";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {} }),
  /* The back control reads where it is to decide where Back goes. */
  usePathname: () => "/u/ada/message",
}));
vi.mock("@/lib/messages/direct-actions", () => ({ sendDirectMessage: vi.fn() }));

import { DirectFirstMessage } from "./DirectFirstMessage";

const copy = { placeholder: "Write a message to Ada", hint: "They get a notification.", send: "Send", sending: "Sending" };

/* Inside the copy provider the root layout draws: the screen's back control
   reads its words from it, and without it the render throws. */
const render = () =>
  renderToStaticMarkup(
    <ClientCopyProvider copy={clientCopyOf(getDictionary("en"))}>
      <DirectFirstMessage handle="ada" name="Ada Eze" avatarUrl="" copy={copy} />
    </ClientCopyProvider>,
  );

describe("DirectFirstMessage", () => {
  it("shows who is being written to, above the box", () => {
    const html = render();
    expect(html).toContain("Ada Eze");
    expect(html).toContain("@ada");
    expect(html).toContain('placeholder="Write a message to Ada"');
  });

  it("cannot send an empty message", () => {
    const html = render();
    expect(html).toMatch(/<button[^>]*disabled[^>]*>/);
  });
});
