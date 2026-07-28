/**
 * Nigerian administrative data.
 *
 * All 36 states plus the Federal Capital Territory, in one place, because the
 * product must be Nigeria-wide from day one and never hardcoded to Lagos
 * (Master Rule 35). LGAs and neighbourhoods land with the location system in a
 * later phase; this states list is what the agent forms need now.
 *
 * Kept as a flat list so it can move to the database unchanged when the canonical
 * State to LGA to Ward hierarchy is built (intake C-05).
 */
export const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
  "FCT (Abuja)",
] as const;

/** Common Nigerian retail banks, for the payout step. Not exhaustive. */
export const NIGERIAN_BANKS = [
  "Access Bank",
  "Citibank",
  "Ecobank",
  "Fidelity Bank",
  "First Bank of Nigeria",
  "First City Monument Bank",
  "Guaranty Trust Bank",
  "Heritage Bank",
  "Keystone Bank",
  "Kuda Microfinance Bank",
  "Moniepoint",
  "Opay",
  "Palmpay",
  "Polaris Bank",
  "Providus Bank",
  "Stanbic IBTC Bank",
  "Standard Chartered",
  "Sterling Bank",
  "Union Bank",
  "United Bank for Africa",
  "Unity Bank",
  "Wema Bank",
  "Zenith Bank",
] as const;
