# Platform screenshots, October 2026

Genuine captures of https://www.vallospaces.com made with the QA member account on 13 October 2026 (`scripts/marketing/capture/run.mjs`, the `sc-*` entries in `plan.mjs`). Mobile captures are the 440 x 894 pt web view at 3x (1320 x 2682); desktop captures are 1440 x 900 at 2x. Each screen exists in dark and light.

The device images in `docs/marketing/device-showcase` put these on a handset with the status bar the native shell draws.

## Empty states (true to the QA account, which has no listings, stays or payments)

`agent`, `host`, `host-rooms`, `host-calendar`, `host-reservations`, `host-bookings`, `inspections`, `payments`, `receipts`, `messages` (stays side). They show the workspaces' real structure and copy but no data. Nothing was added to production to fill them.

## Left out on purpose

- The wallet's setup screen (it names the payments provider).
- The local feed (its only post is the founder's own account).
- A map of live pins (the map tiles cannot load in the capture environment).
- Admin and operations screens (the capture harness has no admin login).

## Product issue found

The assistant's long answers show raw markdown (`**bold**`) as asterisks. The assistant screen here is the start state; recapture the answer after it is fixed.
