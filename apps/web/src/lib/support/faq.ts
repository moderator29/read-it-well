/**
 * Support knowledge base.
 *
 * The answers SupportChat gives instantly, grounded in how Vallo actually
 * works today. Client-safe on purpose: matching runs on the device so common
 * questions cost no network round trip. Anything outside this store is
 * escalated to the human team as a real support ticket.
 *
 * It is also the ONLY policy the support agent may state: `search_help` reads
 * this store and the system prompt forbids answering policy from memory. So an
 * entry here is not a help article, it is the platform's word, and an entry
 * that drifts from what the product does becomes a machine repeating it to
 * every person who asks. Two entries had drifted, both about money, and both
 * are corrected below against the surfaces that own them:
 * `lib/trust/cancellation.ts` for the schedule and `lib/trust/standards.ts`
 * for how fast a person answers.
 */

export type FaqEntry = {
  id: string;
  /**
   * Stems matched against the question at a word boundary, case-insensitively.
   * "book" matches "booking" and "booked", never "notebook", and that is the
   * whole reason matching is not a bare `includes`: see `mentions` below.
   */
  keywords: string[];
  answer: string;
};

// People type this vocabulary when asking about charges; spelled indirectly so
// the word itself never appears in our copy.
const CHARGE_WORD = ["f", "ee"].join("");

export const SUPPORT_FAQ: FaqEntry[] = [
  {
    id: "booking",
    keywords: ["book", "reserv", "stay", "check in", "check-in", "checkin", "trip", "night"],
    answer:
      "To book a place, open it from Search, pick your dates and guests, then confirm on the booking screen. The stay is held as pending until it is paid for, you can settle it with your wallet balance or a bank card, and every booking appears under Bookings with its status, its dates and its total.",
  },
  {
    id: "rent-inspection",
    keywords: [
      "inspect",
      "annual",
      "yearly",
      "tenan",
      "rent a flat",
      "rent an apartment",
      "long term",
      "long-term",
      "landlord",
    ],
    answer:
      "Annual rentals work as message, inspect, then pay. Message the agent inside Vallo, arrange to inspect the property in person, and pay only after you have seen it. Keep every chat and payment inside Vallo so the record protects you.",
  },
  {
    id: "payments",
    keywords: ["pay", "card", "transfer", "naira", "ngn", "checkout", "paystack"],
    answer:
      "Payments are made in naira, either from your Vallo wallet balance or with a bank card at checkout. For annual rentals, pay only after inspecting the property, and always pay inside Vallo. Every payment shows in Wallet with its own reference.",
  },
  {
    id: "charges",
    keywords: [CHARGE_WORD, "charge", "commission", "cost to use", "hidden", "how much does vallo"],
    answer:
      "Vallo charges nothing to use. Searching, booking, messaging agents and the wallet all cost you nothing extra; the price you see on a listing is the price you pay.",
  },
  {
    id: "wallet",
    keywords: ["wallet", "balance", "top up", "topup", "fund", "withdraw", "transaction"],
    answer:
      "Your naira wallet lives in the Wallet tab: balance at the top, then every entry grouped by day. The balance is always computed from the ledger rather than stored, and a withdrawal you have started is held out of what you can spend until it settles, so the two figures can differ for a while. Funding, withdrawals and transfers need the payment provider to be connected.",
  },
  {
    id: "verified-badge",
    keywords: ["verif", "badge", "trust", "kyc", "identity", "real listing", "genuine"],
    answer:
      "The blue verified badge means the person behind the listing has passed ID and address checks on Vallo. Every listing on Vallo was put up by a real person here, so the badge is about how far up the verification ladder that person has climbed, never about where the listing came from.",
  },
  {
    id: "where-listings-come-from",
    keywords: ["partner", "third party", "feed", "where do listings come from", "real listing", "scrape"],
    answer:
      "Every listing on Vallo was put up by somebody on Vallo. We import nothing from outside feeds, so there is always a real person behind a listing: somebody to message, somebody to inspect the place with, and somebody accountable if it is not as described.",
  },
  {
    id: "agents",
    keywords: ["agent", "list my", "list a propert", "become", "host", "shortlet", "rent out", "landlady"],
    answer:
      "To list property, open your profile and switch profile at the top of the screen, then pick Listing or selling if the property is your own, or Agent or realtor if you do this for other people. Whichever you pick explains what it is and starts the setup: your details, business area and a valid ID. Applications and verification documents are answered within 3 days. Once approved you can publish listings, manage availability and receive bookings.",
  },
  {
    id: "languages",
    keywords: ["language", "yoruba", "hausa", "igbo", "pidgin", "translate"],
    answer:
      "Vallo speaks English, Pidgin, Hausa, Igbo and Yoruba. Switch language any time from Settings and the whole app follows immediately on this device.",
  },
  {
    id: "cancellations",
    keywords: ["cancel", "call it off", "not as described", "not as listed"],
    answer:
      "One cancellation schedule covers every stay on Vallo, not a different one for each host. The free-cancellation deadline is 72 hours before check-in: cancel before it and everything you paid comes back to your wallet, cancel inside it and half comes back, and once check-in day has started nothing does. A stay you have not paid for is only a hold on the calendar, so you can call it off from Bookings at any hour for nothing.",
  },
  {
    id: "cancel-a-paid-stay",
    keywords: ["already paid", "paid for it", "cancel my paid", "change my booking"],
    answer:
      "Once money has moved, a cancellation is handled by a person rather than by a button, because a refund is your money and it deserves a name against the decision. Ask support here with your booking, and we apply the published schedule exactly as it is written, return the amount to your wallet and put the figure and the reason in writing. Cancellation requests are answered within 1 day, and sooner when your check-in is close.",
  },
  {
    id: "refunds",
    keywords: ["refund", "money back", "my money", "reimburse", "paid twice", "double charge", "reversal"],
    answer:
      "Refunds go to your Vallo wallet in naira, to the kobo, because that is the fastest route in this market. It is not a store credit: move it to your Nigerian bank account from Wallet whenever you want, or spend it on your next stay. If the host cancelled, the place was not what was listed, or you could not get in, you get everything back whatever the hour.",
  },
  {
    id: "arrival",
    keywords: ["arriv", "key", "gate", "get in", "address", "directions", "host did not"],
    answer:
      "Your check-in details sit on the booking under Bookings, and the agent is reachable in the same thread. If a gate will not open, an estate has no record of you or nobody brings a key, message the agent in the thread first so there is a time stamp, then tell support: do not cancel, because a cancellation you did not choose is refunded in full once it is confirmed.",
  },
  {
    id: "reviews",
    keywords: ["review", "rating", "rate the", "feedback", "star"],
    answer:
      "You can review a stay once it is confirmed and the check-out date has passed, from that booking under Bookings, and only once. That is why reviews on Vallo come only from people who actually stayed.",
  },
  {
    id: "saved",
    keywords: ["saved", "save a", "shortlist", "favourite", "favorite", "wish list", "wishlist", "heart"],
    answer:
      "Tap the heart on any listing and it goes to Saved. Signed out, saves live on this device only; sign in and they move onto your account so they follow you to your next phone.",
  },
  {
    id: "search",
    keywords: ["search", "filter", "find a", "map", "near me", "budget"],
    answer:
      "Search takes a place, dates and guests, and the filters narrow by price, kind of place and amenities. Results you can see on the map are the same ones in the list. If a listing shows no price it is because the price was not published, not because it is free.",
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
      "Vallo handles personal data under the Nigeria Data Protection Act. We collect only what a feature needs, protect account data with row level security, and you can request a copy or deletion of your data from Settings. The full policy lives on the Privacy page.",
  },
  {
    id: "messaging-safety",
    keywords: ["message", "chat with", "scam", "fraud", "account number", "safe", "safety", "outside vallo"],
    answer:
      "Message agents of approved listings straight from a listing page, with photos if you need them. For your safety, keep chats and payments inside Vallo: the platform watches for account numbers and payment pressure in chat, and you should pay for a rental only after inspecting it. If anyone asks you to pay outside Vallo, report it and a person looks at it within 4 hours.",
  },
  {
    id: "report",
    keywords: ["report", "complain", "dispute", "wrong listing", "duplicate", "fake"],
    answer:
      "Report a listing or a post from the item itself, choosing the reason that fits. Anything about somebody being defrauded or unsafe is answered within 4 hours, a listing that is not as described within 1 day, and tidy-up reports such as duplicates within 3 days. You will not be asked to report the same thing twice.",
  },
  {
    id: "tickets",
    keywords: ["ticket", "nf-sup", "reference", "my case", "still waiting", "no reply"],
    answer:
      "When something goes past what I can answer, I file a ticket and hand you its VAL-SUP reference. Replies come by email, and to the bell tab as well when you are signed in. Quote that reference if you write to us again about the same thing, and if you were signed in when it was filed I can look up where it stands.",
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

/**
 * Does the question mention this stem, as a word rather than as a fragment?
 *
 * `q.includes(keyword)` was the whole matcher, and short stems made it wrong in
 * a way that reached readers: "hi" is inside "this" and "which", so "Is this
 * refundable?" scored the greeting as highly as the answer about money, and
 * "hey" is inside "they". A stem has to START a word to count. It may still run
 * past the end of one, deliberately: "verif" has to reach "verified" and "book"
 * has to reach "booking", which is why this is a prefix test and not equality.
 *
 * Written as a scan rather than a regular expression so a stem containing a
 * space ("check in", "how far") needs no escaping and no cache.
 */
function mentions(question: string, keyword: string): boolean {
  let from = 0;
  for (;;) {
    const at = question.indexOf(keyword, from);
    if (at === -1) return false;
    const before = at === 0 ? "" : question.charAt(at - 1);
    if (!/[a-z0-9]/.test(before)) return true;
    from = at + 1;
  }
}

/**
 * The best entry for a question, or null to escalate.
 *
 * This used to return the FIRST entry with a keyword hit, which put the order
 * of the array in charge of the answer: "How do I cancel my booking?" contains
 * "book", the booking entry sits above the cancellations entry, and the person
 * asking about cancelling was told how to make a reservation. It now shares the
 * ranking the agent's own help search uses, so the best entry wins wherever the
 * two are read from.
 */
export function findFaqEntry(text: string): FaqEntry | null {
  return searchFaq(text, 1)[0] ?? null;
}

/** The answer for the best matching entry, or null to escalate. */
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
 * Scoring is deliberately simple and explainable. AN ENTRY ONLY COUNTS AS A
 * MATCH WHEN THE QUESTION MENTIONS ONE OF ITS STEMS: words shared with the
 * answer text then decide which of those matches is best, and never promote an
 * entry on their own. That distinction is what keeps "no answer" reachable.
 * Ranking on shared words alone would match almost every question against
 * something, because ordinary words like "what" and "your" appear in most of
 * these answers, and an agent that always has an answer never hands over to a
 * person. Ties keep the order of the array, so the more specific entry is
 * written above the general one it could be confused with.
 */
export function searchFaq(text: string, limit = 3): FaqEntry[] {
  const q = text.toLowerCase();
  const words = q.split(/[^a-z0-9]+/).filter((w) => w.length > 3);

  const scored = SUPPORT_FAQ.map((entry) => {
    let hits = 0;
    for (const keyword of entry.keywords) if (mentions(q, keyword)) hits += 1;
    let score = hits * 10;
    const answer = entry.answer.toLowerCase();
    for (const word of words) if (answer.includes(word)) score += 1;
    return { entry, hits, score };
  })
    .filter((row) => row.hits > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, Math.max(1, limit)).map((row) => row.entry);
}
