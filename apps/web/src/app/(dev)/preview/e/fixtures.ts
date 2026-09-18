import type { WalletEntry } from "@/lib/wallet/types";
import type { BalanceBreakdown } from "@/lib/wallet/types";
import type { PaymentMethod } from "@/lib/payments/methods";
import type { BankAccount } from "@/lib/payments/bank-accounts-actions";
import type { CoinDetail, MarketRow, PairRow, CryptoResponse } from "@/components/app/crypto/client";
import { COUNTERPART, HOTEL } from "../_fixtures/people";

/**
 * Worker E's fixtures for the preview harness. Brand-neutral, invented,
 * shaped exactly like the real types and the crypto contract, and used by
 * nothing outside `(dev)/preview/e`. Never the proof of the ONE LAW; only
 * the proof of the look.
 */

const DAY = 86_400_000;
const NOW = Date.now();

function at(daysAgo: number, hour: number, minute: number): string {
  const d = new Date(NOW - daysAgo * DAY);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const BALANCE_MINOR = 245_680_00;

export const ENTRIES: WalletEntry[] = [
  {
    id: "00000000-0000-4000-8000-00000000e001",
    kind: "transfer_out",
    direction: "debit",
    amountMinor: 50_000_00,
    reference: "rm-p2p-6f1c2a3e-out",
    status: "COMPLETED",
    createdAt: at(1, 13, 14),
    note: `Transfer to ${COUNTERPART.name}`,
  },
  {
    id: "00000000-0000-4000-8000-00000000e002",
    kind: "transfer_in",
    direction: "credit",
    amountMinor: 30_000_00,
    reference: "rm-p2p-9a8b7c6d-in",
    status: "COMPLETED",
    createdAt: at(2, 18, 32),
    note: "Transfer from Chidinma Okafor",
  },
  {
    id: "00000000-0000-4000-8000-00000000e003",
    kind: "payment",
    direction: "debit",
    amountMinor: 120_000_00,
    reference: "rm-book-2f4e6a8c",
    status: "COMPLETED",
    createdAt: at(3, 16, 21),
    note: "Hotel booking",
    property: `${HOTEL.name}, ${HOTEL.city}`,
  },
  {
    id: "00000000-0000-4000-8000-00000000e004",
    kind: "withdrawal",
    direction: "debit",
    amountMinor: 15_000_00,
    reference: "rm-wd-1b3d5f7a",
    status: "PENDING",
    createdAt: at(4, 9, 3),
  },
  {
    id: "00000000-0000-4000-8000-00000000e005",
    kind: "deposit",
    direction: "credit",
    amountMinor: 200_000_00,
    reference: "rm-fund-4c6e8a0b",
    status: "COMPLETED",
    createdAt: at(5, 20, 45),
  },
  {
    id: "00000000-0000-4000-8000-00000000e006",
    kind: "refund",
    direction: "credit",
    amountMinor: 20_000_00,
    reference: "rm-refund-5d7f9b1c",
    status: "COMPLETED",
    createdAt: at(12, 11, 10),
    property: `${HOTEL.name}, ${HOTEL.city}`,
  },
];

export const BREAKDOWN: BalanceBreakdown = {
  availableMinor: BALANCE_MINOR,
  heldOutMinor: 0,
  heldInMinor: 0,
  outgoing: [],
  incoming: [],
  readFailed: false,
};

export const CARDS: PaymentMethod[] = [
  {
    id: "00000000-0000-4000-8000-00000000c001",
    cardType: "verve",
    last4: "4081",
    expMonth: 9,
    expYear: 2028,
    bank: null,
    reusable: true,
    isDefault: true,
    createdAt: at(30, 10, 0),
  },
];

export const ACCOUNTS: BankAccount[] = [
  {
    id: "00000000-0000-4000-8000-00000000b001",
    bankCode: "044",
    bankName: "Access Bank",
    accountNumber: "0123452210",
    accountName: "SEYI OMOJUNI",
    isDefault: true,
    createdAt: at(40, 10, 0),
  },
];

/* --------------------------------------------------------------- crypto */

function spark(base: number, drift: number, wobble: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < 28; i += 1) {
    const wave = Math.sin(i / 3.1) * wobble + Math.cos(i / 1.7) * (wobble / 2);
    out.push(base + (drift * i) / 27 + wave);
  }
  return out;
}

const CACHED_AT = new Date(NOW - 4 * 60_000).toISOString();

/* Prices in naira, so the default view is the one a Nigerian reader opens. */
export const MARKETS: CryptoResponse<MarketRow[]> = {
  ok: true,
  cachedAt: CACHED_AT,
  data: [
    { id: "bitcoin", symbol: "btc", name: "Bitcoin", image: "", price: 98_412_500, change24h: 2.48, marketCap: 1_940_000_000_000_000, sparkline7d: spark(94_000_000, 4_400_000, 900_000) },
    { id: "ethereum", symbol: "eth", name: "Ethereum", image: "", price: 4_936_200, change24h: 3.21, marketCap: 594_000_000_000_000, sparkline7d: spark(4_700_000, 240_000, 60_000) },
    { id: "solana", symbol: "sol", name: "Solana", image: "", price: 216_980, change24h: 4.32, marketCap: 101_000_000_000_000, sparkline7d: spark(205_000, 12_000, 4_000) },
    { id: "binancecoin", symbol: "bnb", name: "BNB", image: "", price: 885_260, change24h: 1.76, marketCap: 129_000_000_000_000, sparkline7d: spark(860_000, 25_000, 7_000) },
    { id: "ripple", symbol: "xrp", name: "XRP", image: "", price: 3_940, change24h: -0.92, marketCap: 226_000_000_000_000, sparkline7d: spark(4_010, -70, 40) },
    { id: "cardano", symbol: "ada", name: "Cardano", image: "", price: 1_120, change24h: -2.35, marketCap: 39_000_000_000_000, sparkline7d: spark(1_160, -40, 18) },
    { id: "tron", symbol: "trx", name: "TRON", image: "", price: 512, change24h: 0.64, marketCap: 45_000_000_000_000, sparkline7d: spark(505, 7, 4) },
    { id: "chainlink", symbol: "link", name: "Chainlink", image: "", price: 36_450, change24h: 5.87, marketCap: 22_000_000_000_000, sparkline7d: spark(34_000, 2_450, 500) },
    { id: "polkadot", symbol: "dot", name: "Polkadot", image: "", price: 9_870, change24h: -4.18, marketCap: 15_000_000_000_000, sparkline7d: spark(10_300, -430, 120) },
    { id: "litecoin", symbol: "ltc", name: "Litecoin", image: "", price: 168_300, change24h: -1.42, marketCap: 12_000_000_000_000, sparkline7d: spark(171_000, -2_700, 900) },
  ],
};

export const COIN: CryptoResponse<CoinDetail> = {
  ok: true,
  cachedAt: CACHED_AT,
  data: {
    id: "bitcoin",
    symbol: "btc",
    name: "Bitcoin",
    image: "",
    price: 98_412_500,
    change24h: 2.48,
    change7d: 4.61,
    marketCap: 1_940_000_000_000_000,
    volume24h: 68_000_000_000_000,
    high24h: 99_120_000,
    low24h: 95_880_000,
    description:
      "Bitcoin is the first decentralised digital currency. It runs on a public network of computers that agree on a shared record of every transaction, with no bank or company in the middle. New coins are issued on a fixed schedule and the total supply is capped, which is the property most often discussed about it. Prices move with demand on open exchanges around the world, around the clock.",
    chart7d: spark(94_000_000, 4_400_000, 900_000).map((v, i) => [NOW - (27 - i) * 6 * 60 * 60_000, v] as [number, number]),
  },
};

export const PAIRS: CryptoResponse<PairRow[]> = {
  ok: true,
  cachedAt: CACHED_AT,
  data: [
    { address: "0xa1", name: "WETH / USDC", baseSymbol: "WETH", quoteSymbol: "USDC", priceUsd: 3246.17, change24h: 3.2, volume24h: 412_000_000, dex: "Uniswap v3" },
    { address: "0xa2", name: "WBTC / WETH", baseSymbol: "WBTC", quoteSymbol: "WETH", priceUsd: 64_782.32, change24h: 2.4, volume24h: 88_000_000, dex: "Uniswap v3" },
    { address: "0xa3", name: "USDT / USDC", baseSymbol: "USDT", quoteSymbol: "USDC", priceUsd: 1.0002, change24h: 0.01, volume24h: 61_000_000, dex: "Curve" },
    { address: "0xa4", name: "LINK / WETH", baseSymbol: "LINK", quoteSymbol: "WETH", priceUsd: 24.11, change24h: -1.3, volume24h: 9_400_000, dex: "Sushi" },
  ],
};

export const UNCONFIGURED: CryptoResponse<MarketRow[]> = { ok: false, reason: "unconfigured" };
export const UNCONFIGURED_PAIRS: CryptoResponse<PairRow[]> = { ok: false, reason: "unconfigured" };
