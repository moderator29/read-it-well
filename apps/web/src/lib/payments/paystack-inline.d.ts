/**
 * Types for `@paystack/inline-js`, which ships none.
 *
 * WRITTEN FROM THE PUBLISHED BUNDLE, NOT FROM THE DOCUMENTATION. Every member
 * below was read out of `@paystack/inline-js` 2.25.0's own `es/inline.js`,
 * because Paystack's documentation hosts are refused by this session's egress
 * policy and a type written from memory is a type that lies. The package's
 * `package.json` has no `types` field and there is no `@types/` package, so
 * this file is the only thing standing between the checkout and `any`.
 *
 * DELIBERATELY NARROW. The class has a dozen more methods: `checkout`,
 * `newTransaction`, `preloadTransaction`, `paymentRequest`, `cancelTransaction`,
 * `activeTransaction`, the deprecated static `setup`. Only the two this
 * platform uses are declared. Everything else stays undeclared on purpose, so
 * that reaching for `checkout()` (which posts to `api.paystack.co` from the
 * BROWSER, needs a public key, and would require opening `connect-src`) is a
 * compile error rather than a quiet architectural change.
 */
declare module "@paystack/inline-js" {
  /** The payload `onLoad` receives once the checkout iframe has rendered. */
  export type PaystackLoadPayload = {
    id?: string | number;
    customer?: unknown;
    accessCode?: string;
  };

  /**
   * The payload `onSuccess` receives. A HINT, never the truth: it is a
   * `postMessage` from a cross-origin iframe, and what makes money real on
   * this platform is the webhook.
   */
  export type PaystackSuccessPayload = {
    id?: string | number;
    reference?: string;
    status?: string;
    message?: string;
    [key: string]: unknown;
  };

  export type PaystackCallbacks = {
    onLoad?: (payload: PaystackLoadPayload) => void;
    onSuccess?: (payload: PaystackSuccessPayload) => void;
    onCancel?: () => void;
    onError?: (payload: { message?: string }) => void;
  };

  export default class PaystackPop {
    /**
     * Resume a transaction our server already initialised, by its access code.
     *
     * NO PUBLIC KEY, AND THAT IS NOT AN OMISSION. The bundle's parameter
     * validator returns `{ accessCode }` on its first statement whenever an
     * access code is present, before the required-parameter loop runs, so no
     * key is required or read on this path.
     */
    resumeTransaction(accessCode: string, callbacks: PaystackCallbacks): unknown;
    /** Close the popup for a transaction by its id, or the active one. */
    cancelTransaction(id?: unknown): void;
  }
}
