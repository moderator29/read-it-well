import { std, pair } from "./premium.mjs";

export const SHOTS_V2 = [
  std(1, "find-your-next-home-in-nigeria", "home", ["Find your next home", "in Nigeria"]),
  std(2, "featured-homes-picked-for-you", "home-featured", ["Featured homes,", "picked for you"]),
  ...pair(
    { n: 3, slug: "a-sample-listing-every-cost-shown", lines: ["A sample listing,", "every cost shown"] },
    { n: 4, slug: "the-move-in-total-before-you-call", lines: ["The move-in total,", "before you call"] },
    { id: "listing", rotation: { x: -16, y: -16, z: -17 }, fov: 26, h: 1 },
  ),
  std(5, "every-payment-in-one-place", "payments", ["Every payment,", "in one place"], { sub: "Vallo never holds your money." }),
  std(6, "cards-and-accounts-you-pay-with", "payment-methods", ["Cards and accounts", "you pay with"], { sub: "Nothing here is charged without you." }),
  std(7, "save-the-places-you-love", "saved", ["Save the places", "you love"]),
  std(8, "search-homes-across-nigeria", "search", ["Search homes", "across Nigeria"]),
  std(9, "homes-stays-and-restaurants", "welcome-user", ["Homes, stays", "and restaurants"], { sub: "Rent, buy, book a stay or a table." }),
  std(10, "help-is-one-tap-away", "support", ["Help is one tap away"]),
  std(11, "your-wallet-add-send-withdraw", "wallet-user", ["Your wallet,", "add, send, withdraw"], { sub: "Your money is held by our licensed payments provider, not by Vallo." }),
  std(12, "renter-passport-you-choose-to-share", "passport-user", ["Renter passport", "you choose to share"], { sub: "Shown only in conversations you pick." }),
  std(13, "your-workspace-for-every-listing", "workspace-user", ["Your workspace", "for every listing"]),
  std(14, "find-a-restaurant-you-love", "restaurant", ["Find a restaurant", "you love"]),
  std(15, "app-store-header", "home", ["Homes, stays", "and restaurants"], { sub: "Rent, buy, book a stay or a table." }),
  std(16, "app-store-search-results", "home", ["Rent a home", "in Nigeria"], { sub: "See the full move-in cost first." }),
  std(17, "canvas-listing", "listing", ["The move-in total,", "before you call"]),
];
