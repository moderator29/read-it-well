# VALLO WALLET: PREMIUM REDESIGN AND IMPLEMENTATION (the founder's brief, 8 October 2026, verbatim)

The founder's words around it: "you see our wallet this is exactly how I want it to be designed make it clean and next gen like that exactly ... the image 1 the one with wallet and transaction tab you would use okay and in the first one only things to copy from that should be that pay for your space with vallo wallet okay? ... Image 4 is a simple refs for quick transfer top up and payment steps build it all full end to end okay? Design it deeply and elegantly think deeply but the main looks should be the image 1 the second looks in that one the one with the one that have two tab of overview and transactions okay and the receipts payout and refunds should be design and put cleanly in the wallet page too okay but follow that cleanly okay?"

## OBJECTIVE

Redesign and implement the existing VALLO Wallet into a genuinely premium, production-quality mobile fintech experience.

Use the attached wallet design reference as the primary visual direction. Study both screens carefully before making changes.

This is an upgrade to the existing Vallo application, NOT a new standalone wallet and NOT a rewrite of the existing financial infrastructure.

The result should feel like a carefully designed Figma concept brought into a real, working product: polished, clean, balanced, trustworthy, responsive and consistent with Vallo's identity.

## 1. FIRST: AUDIT THE EXISTING IMPLEMENTATION

Before changing any code:

* Locate the current Vallo Wallet pages, components, routes, styles and navigation.
* Identify the existing wallet balance, payment, transaction, withdrawal, transfer, receipt, refund, payout, linked account and wallet settings functionality.
* Trace the current backend services, database models, server actions, API routes, permissions and payment provider integrations.
* Determine which features are implemented, which are incomplete and which are unavailable.
* Inspect the existing design system, icon library, typography, colour tokens, spacing, responsive layouts and dark/light mode support.
* Identify any existing wallet features that must remain unchanged.
* Check whether the app already has reusable transaction cards, balance components, modal sheets, tabs, buttons and account-selection components.

Do not replace existing functionality with dummy data or mock backend operations.

Do not assume that every feature shown in the reference image is already supported by the backend.

Create a concise implementation plan based on the actual repository before editing.

## 2. VISUAL DIRECTION

Build a premium Vallo-specific visual system using:

* Deep midnight navy backgrounds.
* Rich royal blue and electric blue as primary brand colours.
* Warm Vallo orange as a meaningful secondary accent.
* White primary text and restrained blue-grey secondary text.
* Subtle blue gradients on the main balance surface and primary actions.
* Fine borders, controlled highlights and restrained shadows.
* Clean typography, strong hierarchy, precise spacing and generous breathing room.
* Sophisticated financial icons with consistent size, stroke weight and alignment.

Use orange intentionally for the Send action and selected financial highlights, negative transaction amounts or relevant secondary indicators. Do not make every component orange.

Avoid excessive glow, glass effects, neon borders, excessive rounded containers, excessive gradients or gaming-dashboard aesthetics.

The app must feel like a mature financial product, not an AI-generated mockup.

Respect the existing Vallo brand and design tokens. Reuse existing components wherever sensible.

## 3. SCREEN ONE: WALLET OVERVIEW

Design a complete mobile wallet overview screen.

A. Header. Include: a clean Wallet heading; a wallet settings icon in the header; a compact, appropriate account or wallet status indicator when supported by real application data. Keep the header uncluttered. Do not add unnecessary navigation elements.

B. Main balance card. Create a premium dark-blue balance card featuring: total or available balance, accurately labelled according to the existing wallet model; a show/hide balance control; a currency selector only if the application genuinely supports multiple currencies; total received and total spent summaries, if those figures can be calculated accurately from real transactions; a small, refined Vallo-branded illustration or financial visual on the right, without compromising readability; appropriate loading, empty, disconnected, pending and error states. Do not invent account balances, exchange rates, payment statistics or verification badges. Keep the most important figure prominent and the secondary figures compact.

C. Useful wallet benefits. Under the balance card, add a compact horizontal set of feature cards or swipeable highlights for existing supported features, such as: protected payments; payment tracking; transaction records; supported low-fee or fast-transfer benefits, but only when factually accurate. These should not become a large collection of decorative boxes.

D. Recent activity. Show a concise preview of recent real wallet transactions. Each transaction should clearly display: a meaningful transaction icon; transaction title or description; relevant counterparty, when available; date or time; correctly formatted amount; status, such as pending, completed, failed or reversed. Use blue and orange sparingly to distinguish transaction types and financial direction. Include a clear way to open the full transaction history. Do not display fake transactions to make the screen appear populated.

E. Two persistent bottom actions. This is a critical design requirement. At the bottom of the wallet overview, create exactly TWO large capsule-shaped action buttons side by side: LEFT: Withdraw; RIGHT: Send. Both should be large, prominent, easy to tap and visually balanced. Use a premium electric-blue treatment for Withdraw and a tasteful Vallo-orange treatment for Send. Each button must have an appropriate icon and a clear label. Account for iPhone safe areas, Android system navigation, small screens and keyboard behaviour. The buttons must not overlap transaction content, modals or system navigation. On mobile, these two actions should remain easily accessible. If the existing application uses a suitable sticky action area, reuse or refine it.

## 4. SCREEN TWO: WALLET TRANSACTIONS

Build a separate, dedicated wallet transactions screen inspired by the second phone in the reference image. This is a distinct screen, not another copy of the overview.

A. Header and navigation. Include: back navigation; a clear Wallet or Transactions heading; a settings shortcut only if appropriate to the existing navigation architecture.

B. Transaction summary. Display the available balance only if useful in this context, with a compact summary of received and spent amounts if supported by real data. Do not duplicate the entire overview balance card unnecessarily.

C. Transaction filters. Create a clean horizontal, scrollable filter row using the transaction categories that the backend actually supports. Potential filters include: All; Received; Sent; Withdrawals; Payments; Refunds. Adapt these categories to the existing transaction model rather than inventing new transaction types. Filters must actually filter the displayed records.

D. Transaction list. Create a refined, vertically scrollable list of transactions. Each row should include the transaction type, description, counterparty where available, timestamp, amount, currency and status. Use consistent alignment and compact spacing. Make transaction details easy to scan. Tapping a transaction should open its details using the existing functionality or a properly implemented details screen. Support loading, empty, error and pagination states where appropriate. Do not hardcode transaction history.

E. Transaction actions. Keep the transaction list focused on reviewing financial activity. Do not create another permanent Withdraw button or another permanent Send button on this screen if those actions are already persistently available in the wallet overview. If transaction-specific actions are necessary, display them contextually inside the relevant transaction details.

## 5. WALLET TOOLS AND SETTINGS

Payment receipts, linked cards or payment methods, bank accounts, payouts, refunds and wallet settings must NOT clutter the main wallet overview.

Provide a dedicated Wallet Tools / Wallet Settings destination, accessible from the wallet header or the existing wallet navigation.

Use a clean, organised grid or compact horizontal carousel of tool cards, depending on the available screen space.

Organise the tools into sensible groups. Records: payment receipts; transaction history. Payment methods: linked cards or saved payment methods, if supported; bank accounts and account management, if supported. Money management: payouts; refunds; payment activity or payment management, where applicable. Security and preferences: wallet settings; relevant security or account preferences supported by the existing application.

Do not duplicate the full transaction history under multiple labels. A receipt should represent an actual payment record or receipt, not another generic transaction list.

Do not invent card storage, bank-linking, escrow, payout or refund capabilities.

Every displayed tool must lead to a real existing or properly implemented destination. Hide unavailable capabilities or clearly indicate their actual availability.

## 6. REMOVE DUPLICATION AND CLUTTER

This is a strict requirement.

There must be exactly ONE persistent Withdraw action and ONE persistent Send action on the wallet overview.

Do not create a second Withdraw button inside the balance card when the persistent bottom action already provides it.

Do not create a second Send or Transfer button inside the balance card when the persistent bottom action already provides it.

Do not use Send and Transfer as two separate buttons if they trigger the same underlying operation. Determine the existing product terminology and use one consistent label.

Do not place Payment Receipts, Linked Cards, Bank Accounts and Settings in a second bottom navigation bar.

These tools belong in the dedicated wallet tools/settings destination.

Do not add the application's unrelated global bottom navigation to a wallet screen that is intended to operate as a focused financial interface. Inspect the current navigation architecture and remove or suppress inappropriate global navigation only for the relevant wallet route, without breaking the rest of the app.

Keep the layout purposeful. Every element must have a clear function.

## 7. FUNCTIONAL INTEGRATION

Preserve the existing business logic.

* Connect the balance display to the correct existing data source.
* Use the existing authenticated user and wallet ownership rules.
* Preserve transaction permissions and backend validation.
* Connect Withdraw and Send to their real supported flows.
* Preserve currency and amount validation.
* Preserve payment-provider integration.
* Preserve transaction statuses and reconciliation logic.
* Respect any existing verification requirements or wallet eligibility checks.
* Keep sensitive financial operations on the server where required.
* Prevent duplicate submissions and handle network failures.
* Show clear success, pending, unavailable and failure states.
* Use appropriate confirmation steps before consequential financial actions.
* Ensure the interface never implies that a transaction succeeded before the backend confirms it.

Do not create a new wallet ledger, payment system, escrow system or financial provider integration simply to make the UI work.

Do not bypass existing security controls.

If an existing capability is not implemented, do not fake it. Document the gap and leave the interface in a truthful, well-designed state.

## 8. RESPONSIVE DESIGN AND POLISH

Optimise the design for mobile first, especially iPhone-sized screens.

Check: safe-area spacing; small-screen layouts; scrolling behaviour; sticky action positioning; keyboard interactions; modal and bottom-sheet behaviour; text truncation and large amounts; currency formatting; light and dark mode if supported; accessible contrast and touch targets; loading skeletons and empty states; long transaction descriptions; screen-reader labels and accessible button names.

Do not make the desktop layout an enlarged, stretched mobile screen. Respect the application's existing responsive design conventions.

## 9. IMPLEMENTATION WORKFLOW

Work in this order: 1. Audit the existing wallet and its dependencies. 2. Identify the actual data sources and supported capabilities. 3. Inspect the attached visual reference. 4. Establish the screen structure and component hierarchy. 5. Implement the wallet overview. 6. Implement the dedicated transactions screen. 7. Implement or refine the wallet tools/settings destination. 8. Connect all components to real existing application functionality. 9. Check mobile and desktop layouts. 10. Run the available type checks, linting, tests and build commands. 11. Fix regressions introduced by the changes. 12. Review the finished screens against the reference and refine spacing, hierarchy, typography, colours and component alignment.

Reuse existing design-system components where appropriate. Avoid creating unnecessary duplicate components or parallel implementations.

Do not stop after producing a plan or a screenshot. Implement the actual application changes.

Do not rewrite unrelated modules or change unrelated product functionality.

## 10. ACCEPTANCE CRITERIA

The work is complete only when:

* The wallet overview looks premium, clean and distinctly Vallo.
* The balance card has a clear visual hierarchy.
* Withdraw and Send appear as exactly two prominent persistent bottom capsule actions on the overview.
* There are no duplicate persistent withdrawal or transfer actions.
* Transactions have their own dedicated screen with working filters and real data.
* Payment receipts, payment methods, bank accounts, payouts, refunds and settings are organised in the appropriate tools destination, according to actual feature availability.
* The unrelated global navigation does not clutter the focused wallet interface.
* Existing wallet business logic and security controls remain intact.
* Empty, loading, error and disconnected states are handled properly.
* The application passes the relevant checks and builds successfully, or any pre-existing failures are clearly documented.

After implementation, provide a concise report describing: 1. What was changed. 2. Which files and components were modified. 3. Which existing backend integrations were reused. 4. Which features remain unavailable or incomplete. 5. Which checks and tests passed or failed.

The final result must look and behave like a real premium fintech product, not a static mockup.

Priority: exceptional visual quality, clear organisation, no duplicated actions, real functionality and preservation of the existing Vallo platform.
