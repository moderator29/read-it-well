import { getDictionary } from "@vallo/i18n";
import { stayReceipt } from "@/components/app/money/receipt-model";
import { RECEIPT_FIXTURE } from "./fixtures";
import {
  button,
  callout,
  code,
  compose,
  figure,
  heading,
  itemised,
  paragraph,
  person,
  receiptBlock,
  rows,
  space,
  status,
  timeline,
  type Composed,
} from "./render";
import type { EmailKind } from "./icons";

/**
 * EVERY EMAIL COMPONENT IN ONE COMPOSITION, in each register (W9, north star
 * 16.5), so the paint, contrast and text tests hold the components no
 * message uses yet to the same rules as the ones it does. Test data only:
 * nothing in the application imports this, and no value here reaches a
 * reader. The figures are fixture figures in a test, not claims.
 */
export function everyComponent(kind: EmailKind): Composed {
  const t = getDictionary("en");
  const receipt = stayReceipt(RECEIPT_FIXTURE, t, "en")!;
  return compose({
    icon: kind,
    preheader: "Every component the email shell draws, in one message.",
    blocks: [
      heading("Every component"),
      paragraph("The consequence, in one sentence."),
      figure("Paid in total", "₦195,000.50", "Exact to the kobo."),
      status("success", "Confirmed"),
      status("pending", "Waiting on the host"),
      status("failed", "Not paid"),
      status("neutral", "Cancelled"),
      rows([
        { label: "Dates", value: "Fri 14 Aug to Sun 16 Aug", icon: "calendar" },
        { label: "Guests", value: "3 guests", icon: "people" },
      ]),
      itemised(
        [
          { label: "2 nights", value: "₦180,000.50" },
          { label: "Cleaning", value: "₦15,000" },
        ],
        { label: "Total", value: "₦195,000.50" },
      ),
      timeline([
        { label: "Inspection report submitted", detail: "3 October", done: true },
        { label: "Both of you confirm the agreement", done: false },
        { label: "Vallo approves it", done: false },
      ]),
      space({ title: "Two bedroom flat, Herbert Macaulay Way, Yaba", place: "Yaba, Lagos", figureLabel: "Move-in total", figure: "₦2,400,000" }),
      person("Adaeze Chinwe Obi", "Agent"),
      receiptBlock(receipt),
      code("482 913"),
      callout("Never pay anybody outside Vallo."),
      button("Open the booking", "https://vallospaces.com/bookings"),
    ],
    footerLines: ["You are receiving this because a test asked for it."],
  });
}
