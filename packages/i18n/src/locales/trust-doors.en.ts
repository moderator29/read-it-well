/**
 * TWO PUBLIC DOORS THAT MAKE A STRANGER SAFER, in English. V-61 and V-62.
 *
 * Its own module for the reason `price-check.en.ts` gives: `en.ts` is written
 * by several workers at once, and a namespace in its own file touches it with
 * one import and one line.
 *
 * Both doors are open to somebody with no account, so every sentence here says
 * only what the database can prove, and neither door ever names an address, a
 * phone number, or why an account might not be answering.
 *
 *   check        "Is this a Vallo agent?" A number or a code from a WhatsApp
 *                status. Yes names the agent; no is one plain sentence.
 *   safetyShare  the page a renter's trusted contact opens: first name, area,
 *                agent, time, checked in or not. Never where.
 *
 * The other three locales inherit these through `withFallback`.
 */
export const trustDoorsEn = {
  check: {
    metaTitle: "Is this a Vallo agent?",
    chip: "Check before you pay",
    title: "Is this a Vallo agent?",
    lede: "Paste the phone number or the Vallo code (it starts VA-) from the advert, status or flyer you were given.",
    label: "Phone number or Vallo code",
    placeholder: "0803 123 4567 or VA-7K3MP",
    submit: "Check",
    yesTitle: "Yes. This is {name} on Vallo",
    yesTitleNoName: "Yes. This is an agent on Vallo",
    yesRole: { agent: "Agent", owner: "Owner", firm: "Firm" },
    yesIdentity: "Identity checked by Vallo on {date}.",
    yesNoIdentity: "Their identity document has not been checked by Vallo yet.",
    yesTalk: "Talk to them on Vallo",
    yesWhy: "Keep the conversation and any payment inside Vallo, where both of you are protected.",
    noTitle: "No Vallo agent uses this number",
    noCodeTitle: "No Vallo agent has this code",
    noBody: "If somebody told you they are from Vallo, they are not. Do not pay them anything.",
    unreadable: "That is not a Nigerian mobile number or a Vallo code. Check it and try again.",
    limited: "You have checked a lot of numbers. Try again {when}.",
    failed: "We could not check just now. This is on our side. Nothing was recorded. Try again in a few minutes.",
    privacy: "We never show an agent's number. We only say whether it matches one an agent registered.",
    inSearch: "Is {query} a Vallo agent? Check it",
  },

  agentCard: {
    title: "Let renters check you",
    lede: "Print your Vallo code on your adverts. Anybody can check it at vallospaces.com/check and see your name, never your number.",
    codeLabel: "Your Vallo code",
    numberTitle: "Your business number",
    numberLede: "Register the number you advertise so a renter who pastes it is told it is you. It is never shown to anybody; we keep only a check value.",
    numberLabel: "Business number",
    registered: "Registered: a number ending {hint}.",
    none: "No number registered.",
    save: "Register this number",
    remove: "Remove it",
    taken: "Another account has already registered this number.",
    invalid: "Give a Nigerian mobile number, like 0803 123 4567.",
    failed: "That did not save. Nothing has changed. Please try again.",
    unavailable: "Your Vallo code could not be read just now.",
  },

  safetyShare: {
    control: "Tell someone where I am going",
    controlHint: "They get a link showing the area and who you are meeting, never the address. You send it from your own phone.",
    shareText: "{name} is at a property inspection in {area}. Follow along on Vallo:",
    shareTextNoName: "I am at a property inspection in {area}. Follow along on Vallo:",
    stripTitle: "Going alone?",
    linkLabel: "The link you are sending",
    shareTitle: "My inspection",
    copied: "Link copied. Paste it to someone you trust.",
    copy: "Copy the link",
    done: "I'm done",
    doneHint: "Tap when you have left, so the person you told knows you are safe.",
    doneThanks: "Thank you. Their page now says you checked in.",
    shared: "Shared. Their page updates when you tap I'm done.",
    failed: "The link was not made. Nothing was sent. Please try again.",
    pageTitle: "{name} is at an inspection in {area}",
    pageTitleNoName: "A Vallo member is at an inspection in {area}",
    pageWith: "With {agent}.",
    pageIdentity: "{agent}'s identity was checked by Vallo on {date}.",
    pageWhen: "From {start}. Expected back by {back}.",
    pageDone: "Checked in at {time}. They have left the inspection.",
    pageWaiting: "Not checked in yet. They have not tapped I'm done.",
    pageOverdue: "Not checked in yet, and it is now past the time they expected to be back. Try calling them. If you cannot reach them and you are worried, call 112.",
    pageNoAddress: "This page never shows the address, so it is safe to forward.",
    call: "Call 112",
    unknownTitle: "This link is not live",
    unknownBody: "It may have been replaced by a newer link, or copied incompletely. Ask the person who sent it.",
    expiredTitle: "This inspection is over",
    expiredBody: "The page closes four hours after the inspection time.",
    failedTitle: "We could not open this page",
    failedBody: "This is on our side. Try again in a few minutes. If you are worried about someone, call them, or call 112.",
    metaTitle: "An inspection on Vallo",
  },
};
