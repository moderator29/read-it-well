# Video calling: the provider decision

**Decision: LiveKit** (LiveKit Cloud for launch, with the open-source
`livekit-server` as the no-lock-in fallback and the local test harness).
**Second choice: Daily.** Agora was evaluated and not chosen.
One provider is integrated, behind `lib/calls/provider/types.ts`
(`CallProvider`); a swap is one new adapter file.

## How the evidence was gathered, and its limits

- Official pages (livekit.com, docs.livekit.io, daily.co, docs.daily.co,
  agora.io, docs.agora.io) could **not** be fetched from this sandbox: the
  egress proxy refuses them by policy (HTTP 403 on CONNECT), so every price
  below comes from search-engine extracts of the official pages, retrieved 8
  October 2026, and is marked accordingly. **Re-check each figure on the live
  page before budgeting.** No price here is invented; where sources disagreed
  it says so.
- Facts about LiveKit's protocol were then **verified by running it**: the
  open-source `livekit-server` 1.13.7 was built from its Go module source
  (proxy.golang.org was reachable; GitHub release downloads were not), and two
  real Chromium pages held a call with tokens minted by Vallo's adapter
  (`VIDEO-CALLING-TEST-REPORT.md`). That is evidence about the protocol and the
  open-source server, not about LiveKit Cloud's service.
- SDK versions and dependencies were read from the npm registry (reachable).

## The matrix

| | LiveKit | Daily | Agora |
|---|---|---|---|
| Model | Open-source SFU (Apache 2.0) + managed Cloud | Managed only | Managed only (proprietary SD-RTN) |
| Web SDK | `livekit-client` 2.22.3 (7 Sep 2026), framework-agnostic, no React peer; optional `@livekit/components-react` 2.9.24 (peer `react >=18`) | `@daily-co/daily-js`, framework-agnostic; React helpers | Agora Web SDK 4.x; React wrapper |
| Fit with React 19 / Next 16 here | Client SDK has no React dependency, so no version coupling; Vallo draws its own UI | Same | Same, but Agora's own FAQ has advised against its Web SDK on iOS Safari (3.x FAQ; check 4.x) |
| Capacitor / WebView | Plain WebRTC in the WebView; no Capacitor plugin needed for foreground calls. Native Swift/Kotlin SDKs exist for a later CallKit build | Docs list iOS WKWebView in-app browsers (iOS 14+) and Android WebView as supported | Web SDK support follows iOS WebKit; native iOS SDK suggested for reliability |
| Server tokens | HS256 JWT signed with the API secret; room, identity, per-source publish grants (`canPublishSources`), TTL | Meeting tokens (JWT, `room_name`, `exp`, `eject_at_token_exp`); rooms public by default unless set private | AccessToken2 via Agora's token builder (channel, uid, role, token and privilege expiry) |
| Webhooks | `Authorization` JWT carrying the body's sha256, signed with the API secret (verified here against the real server) | `X-Webhook-Signature` HMAC-SHA256 over timestamp + body | Notifications: `Agora-Signature-V2` HMAC-SHA256; retried up to three times |
| Room control | Twirp RoomService: create (max participants, empty timeout), delete, list participants, remove (all verified here) | REST rooms API | REST channel management |
| TURN / weak networks | Embedded TURN (UDP 3478, TLS 5349/443) in OSS; Cloud provides it; simulcast, dynacast, adaptive stream | Managed TURN; simulcast | SD-RTN global network |
| Recording | Egress (separately billed); **not used by Vallo** | Cloud recording add-on | Cloud recording add-on |
| Regions, residency | Cloud regions incl. an Africa region (South Africa per LiveKit's region list; single location, so no in-region redundancy, inferred); region pinning on Scale plan and above; project data region fixed at creation. Self-host anywhere | Managed; check DPA | Global; check DPA |
| Lock-in | Lowest: same protocol self-hosted | Medium | Highest |
| Testable here without credentials | **Yes** (OSS server ran locally) | No | No |

## Prices, as extracted on 8 October 2026 (verify before budgeting)

| Provider | Free allowance | Paid rate | Other | Source |
|---|---|---|---|---|
| LiveKit Cloud | Build plan $0/month; 5,000 WebRTC participant-minutes and 50 GB downstream per month (official page extract; a third-party page differs) | Ship $50/month with 150,000 minutes then $0.0005/min; Scale $500/month with 1.5M minutes then $0.0004/min; Enterprise custom. Billed per second, 10 s minimum increment | Downstream data metered, upstream not (2025 LiveKit pricing post): $0.12/GB with 250 GB on Ship and 3 TB on Scale (that post is old; unverified today). The official page extract lists 5,000 concurrent connections on Scale (a third-party page says unlimited) | [livekit.com/pricing](https://livekit.com/pricing), [livekit.com/pricing.md](https://livekit.com/pricing.md), [pricing model post](https://livekit.com/blog/towards-a-future-aligned-pricing-model), [per-second metering](https://livekit.com/blog/introducing-per-second-metering-for-livekit) |
| Daily | 10,000 participant-minutes per month | $0.0040 per participant-minute with video, $0.00099 audio-only (a session that sends any video bills as video), volume discounts to $0.0015 | Recording $0.01349/min | [daily.co/pricing/video-sdk](https://www.daily.co/pricing/video-sdk/) |
| Agora | 10,000 "Standard" minutes per month (converted by stream type) | Video HD $3.99 per 1,000 participant-minutes, Full HD $8.99, audio $0.99 | All participants billed | [agora.io/en/pricing/agora-rtc](https://www.agora.io/en/pricing/agora-rtc), [docs pricing](https://docs.agora.io/en/video-calling/overview/pricing) |

**A 10-minute two-person video call is 20 participant-minutes.** Connection
fees: LiveKit about $0.01 on Ship overage, Daily $0.08, Agora about $0.08.
LiveKit also bills downstream bandwidth: at an assumed 1.5 Mbit/s per received
video stream, two receivers for 10 minutes is about 0.225 GB, about $0.03 at
$0.12/GB (an assumption, not a measurement; real bitrate adapts to the
network). On the free tiers, Daily and Agora allow about 500 such calls a
month, LiveKit Build about 250. These are estimates; `public.calls`
keeps estimated and reconciled usage in separate columns so the bill can be
checked against them.

## Why LiveKit

1. **The real work is Vallo's, not the provider's.** Invitations, state,
   permissions, history, notifications and review workflows live in Vallo's
   database. LiveKit is the thinnest media layer of the three: a room, a
   token, a webhook. Nothing about calls depends on LiveKit beyond one file.
2. **No lock-in, provable now.** The same protocol runs self-hosted, so the
   whole integration was exercised end to end in this sandbox with no
   account, and a future move off LiveKit Cloud (cost, residency, outage) is
   a deployment change, not a rewrite.
3. **Least privilege in the token.** `canPublishSources` lets a voice call
   token refuse a camera at the server (verified: "insufficient
   permissions"), `canPublishData: false`, no admin grants, ten-minute TTL,
   with server-side token refresh on the live connection.
4. **Price.** Lowest per-minute cost at our expected scale, with an explicit
   bandwidth line to watch.
5. **No new dependency for the server.** Tokens and webhook checks are HS256
   JWTs, implemented with `node:crypto` and verified against the real
   server, so the lockfile is untouched (D46). The browser needs
   `livekit-client` (see the production checklist: the lockfile owner adds it).

## Why Daily is second

The strongest managed-only option: clear webhooks, private rooms with
meeting tokens, documented WebView support, a simple price. It lost on cost
per minute (about 8x LiveKit's connection fee), on lock-in (no self-hosted
server), and because nothing could be tested here without an account. If
LiveKit Cloud's Africa latency or support proves poor, Daily is the swap:
implement `CallProvider` for Daily's rooms and meeting tokens, keep
everything else.

## Why not Agora

Proprietary transport with no self-hosted path, a token builder library
needed on the server, minute pricing converted through "standard minutes",
and Agora's own guidance has historically steered iOS web users to its native
SDK, which inside a Capacitor shell would mean a custom plugin. Nothing it
offers is needed for one-to-one calls that LiveKit does not also offer.

## What would change this decision

- LiveKit Cloud's measured connection success or latency from Lagos and Abuja
  on MTN, Airtel and Glo is poor in the pilot (`VIDEO-CALLING-OPEN-QUESTIONS.md`).
- The data-protection review requires in-country hosting that only a
  self-hosted server can give (then self-host LiveKit; the code does not change).
- Recording becomes a real requirement with legal sign-off (all three can;
  LiveKit Egress is separately priced).
