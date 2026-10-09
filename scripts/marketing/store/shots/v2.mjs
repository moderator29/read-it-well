import { std, pair } from "./premium.mjs";

export const SHOTS_V2 = [
  std(1, "find-your-next-home-in-nigeria", "home", ["Find your next home", "in Nigeria"]),
  std(2, "featured-homes-picked-for-you", "home-featured", ["Featured homes,", "picked for you"]),
  ...pair(
    { n: 3, slug: "a-sample-listing-every-cost-shown", lines: ["A sample listing,", "every cost shown"] },
    { n: 4, slug: "the-move-in-total-before-you-call", lines: ["The move-in total,", "before you call"] },
    { id: "listing", rotation: { x: -16, y: -16, z: -17 }, fov: 26, h: 1 },
  ),
  std(5, "your-wallet-every-payment", "payments", ["Your wallet,", "every payment"], { sub: "Vallo never holds your money." }),
  std(6, "cards-and-accounts-you-pay-with", "payment-methods", ["Cards and accounts", "you pay with"], { sub: "Nothing here is charged without you." }),
  std(7, "save-the-places-you-love", "saved", ["Save the places", "you love"]),
  std(8, "search-homes-across-nigeria", "search", ["Search homes", "across Nigeria"]),
  std(9, "get-started-in-a-minute", "sign-up", ["Get started", "in a minute"]),
  std(10, "help-is-one-tap-away", "support", ["Help is one tap away"]),
];
