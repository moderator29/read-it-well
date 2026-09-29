import { appUrl, button, compose, heading, hello, money, note, paragraph, rows, type Block, type ReceiptRow } from "@/lib/email/render";
import type { CryptoState } from "./state-machine";
import type { CryptoPaymentView } from "./view";

/**
 * What the payer is told at each state of a crypto payment, in the app and by
 * email. One builder so the two channels never say different things.
 *
 * Every message says, in this order: what happened to the money, whose hands
 * it is in (the provider's, never Vallo's), and what to do next. The receipt
 * (settled) carries every figure a person would need to prove the payment:
 * the naira charge, the asset and network, the amount sent, the rate, the
 * transaction hash and both references.
 */

export type CryptoMessage = {
  title: string;
  body: string;
  /** Null for a state that is in-app only (a progress step nobody needs mailed). */
  email: { subject: string; html: string; text: string } | null;
};

const NOT_VALLO =
  "Vallo never holds your crypto or your money. The deposit address belongs to the licensed provider, which converts the crypto and settles naira straight to the owner or agent.";

export function cryptoPaymentPath(reference: string): string {
  return `/pay/crypto/${encodeURIComponent(reference)}`;
}

function receiptRows(view: CryptoPaymentView, providerName: string): ReceiptRow[] {
  const list: ReceiptRow[] = [
    { label: "Charge paid", value: money(view.amountMinor), strong: true },
    { label: "Sent", value: `${view.cryptoReceived ?? view.cryptoAmount} ${view.asset}` },
    { label: "Network", value: view.networkName },
    { label: "Rate", value: `₦${view.rate} per ${view.asset}` },
  ];
  if (view.feeMinor > 0) list.push({ label: `${providerName} fee`, value: money(view.feeMinor) });
  if (view.txHash) list.push({ label: "Transaction hash", value: view.txHash });
  list.push({ label: "Vallo reference", value: view.reference });
  if (view.providerPaymentId) list.push({ label: `${providerName} reference`, value: view.providerPaymentId });
  return list;
}

function mail(subject: string, preheader: string, blocks: Block[]): CryptoMessage["email"] {
  const composed = compose({
    preheader,
    blocks,
    footerLines: [
      "You are receiving this because you chose to pay a charge on Vallo in crypto.",
      NOT_VALLO,
    ],
  });
  return { subject, html: composed.html, text: composed.text };
}

export function cryptoMessage(
  state: CryptoState,
  view: CryptoPaymentView,
  options: { name?: string | null; providerName: string },
): CryptoMessage | null {
  const link = appUrl(cryptoPaymentPath(view.reference));
  const amount = `${view.cryptoAmount} ${view.asset}`;
  const provider = options.providerName;
  switch (state) {
    case "awaiting_payment": {
      const body = `Send exactly ${amount} on ${view.networkName} to ${provider}'s address before the quote runs out. Nothing has been paid yet.`;
      return {
        title: "Your crypto payment is ready",
        body,
        email: mail("Send your crypto payment", body, [
          heading("Your crypto payment is ready"),
          paragraph(`${hello(options.name)} ${body}`),
          rows([
            { label: "Send", value: amount, strong: true },
            { label: "Network", value: view.networkName },
            { label: "To", value: view.depositAddress ?? "Shown in the app" },
            ...(view.depositMemo ? [{ label: "Memo", value: view.depositMemo }] : []),
            { label: "Pays", value: money(view.amountMinor) },
          ]),
          paragraph(view.networkWarning),
          button("Open the payment", link, true),
          note(NOT_VALLO),
        ]),
      };
    }
    case "confirming":
      return {
        title: "We can see your crypto on its way",
        body: `${provider} has seen your transfer and is waiting for the network to confirm it. The charge is not paid until it settles.`,
        email: null,
      };
    case "underpaid": {
      const got = view.cryptoReceived ? `${view.cryptoReceived} ${view.asset}` : "less than the quote";
      const body = `${provider} received ${got}, less than the ${amount} quoted. Send the rest to the same address before the quote runs out, or ${provider} returns what arrived to your refund address.`;
      return {
        title: "Your crypto payment is short",
        body,
        email: mail("Your crypto payment is short", body, [
          heading("Your crypto payment is short"),
          paragraph(`${hello(options.name)} ${body}`),
          button("See what is left to send", link, true),
          note(NOT_VALLO),
        ]),
      };
    }
    case "overpaid": {
      const extra = view.cryptoOverpaid ? `${view.cryptoOverpaid} ${view.asset}` : "the difference";
      const body = `${provider} received more than the ${amount} quoted. It will convert the charge and return ${extra} to your refund address.`;
      return {
        title: "You sent more than the quote",
        body,
        email: mail("You sent more than the quote", body, [
          heading("You sent more than the quote"),
          paragraph(`${hello(options.name)} ${body}`),
          rows([{ label: "Returned to", value: view.refundAddress ?? "Your refund address" }]),
          button("Open the payment", link, true),
          note(NOT_VALLO),
        ]),
      };
    }
    case "converting":
      return {
        title: "Your crypto is confirmed",
        body: `${provider} is converting it and settling ${money(view.amountMinor)} to the owner or agent.`,
        email: null,
      };
    case "settled": {
      const body = `Your ${money(view.amountMinor)} charge is paid. ${provider} settled the naira straight to the owner or agent.`;
      return {
        title: "Paid in crypto",
        body,
        email: mail(`Receipt: ${money(view.amountMinor)} paid in crypto`, body, [
          heading("Paid"),
          paragraph(`${hello(options.name)} ${body}`),
          rows(receiptRows(view, provider)),
          button("Open your receipt", link, true),
          note(NOT_VALLO),
        ]),
      };
    }
    case "expired": {
      const body = "The quote ran out before your crypto arrived, so nothing was paid. Get a new quote to try again. If you did send something, the provider returns it to your refund address.";
      return {
        title: "Your crypto quote ran out",
        body,
        email: mail("Your crypto quote ran out", body, [
          heading("Your crypto quote ran out"),
          paragraph(`${hello(options.name)} ${body}`),
          button("Get a new quote", link, true),
          note(NOT_VALLO),
        ]),
      };
    }
    case "refunded": {
      const what = view.cryptoRefunded ? `${view.cryptoRefunded} ${view.asset}` : "your crypto";
      const body = `${provider} returned ${what} to your refund address. The charge is not paid.`;
      return {
        title: "Your crypto was returned",
        body,
        email: mail("Your crypto was returned", body, [
          heading("Your crypto was returned"),
          paragraph(`${hello(options.name)} ${body}`),
          rows([
            { label: "Returned to", value: view.refundAddress ?? "Your refund address" },
            ...(view.refundTxHash ? [{ label: "Transaction hash", value: view.refundTxHash }] : []),
          ]),
          button("Open the payment", link, true),
          note(NOT_VALLO),
        ]),
      };
    }
    case "failed": {
      const body = `${provider} could not complete this crypto payment, so the charge is not paid. If you sent crypto, ${provider} returns it to your refund address. You can pay another way.`;
      return {
        title: "Your crypto payment did not go through",
        body,
        email: mail("Your crypto payment did not go through", body, [
          heading("Your crypto payment did not go through"),
          paragraph(`${hello(options.name)} ${body}`),
          button("Open the payment", link, true),
          note(NOT_VALLO),
        ]),
      };
    }
    case "quoted":
      return null;
  }
}
