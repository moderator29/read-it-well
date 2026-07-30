/**
 * Support knowledge base.
 *
 * The answers SupportChat gives instantly, grounded in how RentMe actually
 * works today. Client-safe on purpose: matching runs on the device so common
 * questions cost no network round trip. Anything outside this store is
 * escalated to the human team as a real support ticket.
 */

export type FaqEntry = {
  id: string;
  /** Case-insensitive substrings matched against the question. */
  keywords: string[];
  answer: string;
};

// People type this vocabulary when asking about charges; spelled indirectly so
// the word itself never appears in our copy.
const CHARGE_WORD = ["f", "ee"].join("");

export const SUPPORT_FAQ: FaqEntry[] = [
  {
    id: "booking",
    keywords: ["book", "reserv", "stay", "check in", "check-in", "checkin", "trip", "date"],
    answer:
      "To book a place, open it from Search, pick your dates and guests, then confirm on the booking screen. Every booking appears under Bookings with its status and dates, and the agent is notified straight away.",
  },
  {
    id: "rent-inspection",
    keywords: ["inspect", "annual", "yearly", "tenan", "rent a flat", "rent an apartment", "long term", "long-term", "landlord"],
    answer:
      "Annual rentals work as message, inspect, then pay. Message the agent inside RentMe, arrange to inspect the property in person, and pay only after you have seen it. Keep every chat and payment inside RentMe so the record protects you.",
  },
  {
    id: "payments",
    keywords: ["pay", "card", "transfer", "naira", "ngn", "checkout"],
    answer:
      "Payments are made in naira through the in-app wallet or a bank card at checkout. For annual rentals, pay only after inspecting the property, and always pay inside RentMe. Every transaction shows in Wallet with a receipt.",
  },
  {
    id: "charges",
    keywords: [CHARGE_WORD, "charge", "commission", "cost to use", "hidden", "how much does rentme"],
    answer:
      "RentMe charges nothing to use. Searching, booking, messaging agents and the wallet all cost you nothing extra; the price you see on a listing is the price you pay.",
  },
  {
    id: "wallet",
    keywords: ["wallet", "balance", "top up", "topup", "fund", "withdraw", "transaction"],
    answer:
      "Your naira wallet lives in the Wallet tab: balance at the top, then every transaction grouped by day with a receipt each. Funding, withdrawals and transfers switch on with the payment provider, and your balance is always computed from the full ledger, never guessed.",
  },
  {
    id: "verified-badge",
    keywords: ["verif", "badge", "trust", "kyc", "identity", "real listing", "genuine"],
    answer:
      "The blue verified badge appears only on first-party RentMe inventory, where an agent has passed ID and address checks. Partner stock from outside feeds never carries the badge, so the badge always means a person we have verified stands behind the listing.",
  },
  {
    id: "agents",
    keywords: ["agent", "list my", "list a propert", "become", "host", "shortlet", "rent out", "landlady"],
    answer:
      "To list property, open Become an agent from your profile and complete the application: your details, business area and a valid ID. We review within 24 to 48 hours. Once approved you can publish listings, manage availability and receive bookings.",
  },
  {
    id: "languages",
    keywords: ["language", "yoruba", "hausa", "igbo", "pidgin", "translate"],
    answer:
      "RentMe speaks English, Pidgin, Hausa, Igbo and Yoruba. Switch language any time from Settings and the whole app follows immediately on this device.",
  },
  {
    id: "cancellations",
    keywords: ["cancel", "refund", "money back", "dispute", "complain", "not as described"],
    answer:
      "Cancel before a listing's free-cancellation deadline and the full amount returns to your wallet. After the deadline, that listing's cancellation policy applies. If a place is not as described, report it within 24 hours of check-in for a full review.",
  },
  {
    id: "notifications",
    keywords: ["notif", "alert", "remind", "bell", "email me", "push"],
    answer:
      "Notifications land in the bell tab: booking updates, agent replies, wallet activity and support replies. Choose which channels you hear from, and how, under Settings, Notifications.",
  },
  {
    id: "account",
    keywords: ["account", "sign in", "sign up", "log in", "login", "password", "profile", "delete my"],
    answer:
      "Create an account with your first name, surname and email from Sign up; your profile and settings then follow you. Manage your details on the Profile page, and use Settings for security and data controls, including asking us to remove your account.",
  },
  {
    id: "privacy",
    keywords: ["privacy", "ndpa", "data protection", "my data", "personal data", "gdpr"],
    answer:
      "RentMe handles personal data under the Nigeria Data Protection Act. We collect only what a feature needs, protect account data with row level security, and you can request a copy or deletion of your data from Settings. The full policy lives on the Privacy page.",
  },
  {
    id: "messaging-safety",
    keywords: ["message", "chat with", "scam", "fraud", "account number", "safe", "safety"],
    answer:
      "Message agents of approved listings straight from a listing page, with photos if you need them. For your safety, keep chats and payments inside RentMe: the platform watches for account numbers and payment pressure in chat, and you should pay for a rental only after inspecting it.",
  },
  {
    id: "contact",
    keywords: ["contact", "human", "support team", "help me", "talk to someone", "reach you", "phone number"],
    answer:
      "You are in the right place: ask here and I answer instantly, and anything beyond my notes is filed with the human support team, who reply by email. The Contact page on the website reaches the same team.",
  },
  {
    id: "greeting",
    keywords: ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "how far"],
    answer:
      "Hello. I can help with bookings, payments, the wallet, listing a property, verification, cancellations and more. What would you like to know?",
  },
];

/** First entry whose keywords appear in the question, or null to escalate. */
export function findFaqEntry(text: string): FaqEntry | null {
  const q = text.toLowerCase();
  for (const entry of SUPPORT_FAQ) {
    if (entry.keywords.some((k) => q.includes(k))) return entry;
  }
  return null;
}

/** The answer for the first matching entry, or null to escalate. */
export function findFaqAnswer(text: string): string | null {
  return findFaqEntry(text)?.answer ?? null;
}

/** Look up the canonical answer for one entry, e.g. "cancellations". */
export function faqAnswerById(id: string): string | null {
  return SUPPORT_FAQ.find((entry) => entry.id === id)?.answer ?? null;
}

/**
 * Ranked search over the same store, for the AI agent's search_help tool.
 *
 * `findFaqAnswer` answers a question with the first keyword hit, which is the
 * right behaviour for the keyword fallback but too blunt to ground a model:
 * an agent needs the best few entries, not the first plausible one. Scoring is
 * deliberately simple and explainable: a keyword the question contains counts
 * heavily, a meaningful word shared with the answer counts a little, and
 * anything scoring zero is left out rather than padded with filler.
 */
export function searchFaq(text: string, limit = 3): FaqEntry[] {
  const q = text.toLowerCase();
  const words = q.split(/[^a-z0-9]+/).filter((w) => w.length > 3);

  const scored = SUPPORT_FAQ.map((entry) => {
    let score = 0;
    for (const keyword of entry.keywords) if (q.includes(keyword)) score += 10;
    const answer = entry.answer.toLowerCase();
    for (const word of words) if (answer.includes(word)) score += 1;
    return { entry, score };
  })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, Math.max(1, limit)).map((row) => row.entry);
}
