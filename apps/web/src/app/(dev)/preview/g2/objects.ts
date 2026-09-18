import type { BrandIconObject } from "@/design-system/icons/BrandIcon";

/**
 * The objects cropped from the reference renders, generated from
 * `scripts/icon-manifest.mjs` (RENDER_CROPS). `render` is the first eight
 * characters of the source render's filename under docs/design/references
 * (or "landing hero" and "landing fullpage" for the two governing landing renders),
 * `native` the longer edge of the object at source, in the render's pixels.
 */
export const G2_OBJECTS: ReadonlyArray<{ name: BrandIconObject; render: string; native: number }> = [
  { name: "wallet-naira", render: "6AF37222", native: 186 },
  { name: "send-plane-tile", render: "6AF37222", native: 52 },
  { name: "phone-tile", render: "6AF37222", native: 52 },
  { name: "bill-tile", render: "6AF37222", native: 52 },
  { name: "stays-hotel-palms", render: "FD3DFE84", native: 252 },
  { name: "hotel-bed", render: "FD3DFE84", native: 42 },
  { name: "apartment-block", render: "FD3DFE84", native: 40 },
  { name: "palm-tree", render: "FD3DFE84", native: 38 },
  { name: "guest-house", render: "FD3DFE84", native: 38 },
  { name: "serviced-block", render: "FD3DFE84", native: 40 },
  { name: "flip-coin", render: "BCD39CA8", native: 86 },
  { name: "calendar-grid", render: "50E032EA", native: 84 },
  { name: "bookmark-ribbon", render: "50E032EA", native: 84 },
  { name: "wallet-tile", render: "50E032EA", native: 84 },
  { name: "shield-check-tile", render: "50E032EA", native: 84 },
  { name: "role-switch-tile", render: "50E032EA", native: 70 },
  { name: "person-card", render: "7F96BE6C", native: 56 },
  { name: "bell-tile", render: "7F96BE6C", native: 56 },
  { name: "palette", render: "7F96BE6C", native: 56 },
  { name: "globe", render: "7F96BE6C", native: 56 },
  { name: "headset", render: "7F96BE6C", native: 56 },
  { name: "card-tile", render: "7F96BE6C", native: 56 },
  { name: "bank-column", render: "7F96BE6C", native: 52 },
  { name: "home-ring", render: "landing hero", native: 46 },
  { name: "people-ring", render: "landing hero", native: 46 },
  { name: "city-ring", render: "landing hero", native: 46 },
  { name: "shield-ring", render: "landing hero", native: 46 },
  { name: "key-ring", render: "landing hero", native: 36 },
  { name: "bed-ring", render: "landing hero", native: 36 },
  { name: "chart-ring", render: "landing hero", native: 36 },
  { name: "brain-ring", render: "landing hero", native: 36 },
  { name: "wallet-ring", render: "landing hero", native: 36 },
  { name: "calendar-ring", render: "landing hero", native: 36 },
  { name: "chat-ring", render: "landing hero", native: 36 },
  { name: "inspect-ring", render: "landing hero", native: 36 },
  { name: "manage-ring", render: "landing hero", native: 36 },
  { name: "brain-chip", render: "landing fullpage", native: 40 },
  { name: "wallet-chip", render: "landing fullpage", native: 40 },
  { name: "globe-chip", render: "landing fullpage", native: 40 },
  { name: "building-chip", render: "landing fullpage", native: 40 },
  { name: "search-ring", render: "landing fullpage", native: 36 },
];
