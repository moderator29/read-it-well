# Delivery report: platform showcase, launch campaign and two videos (13 October 2026)

Product state: `main` at b0760e936, merged into `claude/clever-bardeen-qfvb18`. Captures are from https://www.vallospaces.com with the QA member account.

## Files

| What | Where | Count / format |
|---|---|---|
| Video One, How Vallo Works | `docs/marketing/videos/vallo-video-1-how-vallo-works.mp4` | 2:20.8, 1920 x 1080, 30 fps, H.264 + AAC, 31 MB, -14.8 LUFS |
| Video Two, The Vallo Vision and What's Coming | `docs/marketing/videos/vallo-video-2-vision-and-whats-coming.mp4` | 3:39.2, 1920 x 1080, 30 fps, H.264 + AAC, 40 MB, -14.7 LUFS |
| Soundtracks (music + sound cues, no voice) and cue lists | `docs/marketing/videos/audio/` | 2 x m4a, 2 x json |
| Device showcase | `docs/marketing/device-showcase/{ios,android}/{dark,light}/NN-area.jpg` | 60 images, 2160 x 3840 |
| Genuine screenshots | `docs/marketing/screenshots-2026-10/{mobile,desktop}-{dark,light}/` | 29 + 29 mobile, 4 + 4 desktop (webp) |
| Launch campaign | `docs/marketing/campaign-2026-10/{x,telegram,instagram-feed,instagram-story}/` and `COPY.md` | 20 posts x 4 sizes = 80 images, with headline, text, call to action and link per post |
| Facts for both films | `scripts/marketing/video/FACTS-OCT.md` | every claim with its source and badge |

## Source projects (revise and re-render)

- Films: `scripts/marketing/video/reels/` (`kit.js` the scene kit, `v1/main.js`, `v2/main.js`, `showcase/`). Render: `node scripts/marketing/video/engine/render.mjs --film desktop --reel v1 --fps 30 --workers 3 --out <file>.mp4`, then mix with `scripts/marketing/audio/reel_mix.py` (music from `music.py --timeline reels/v1/timeline.json`). Video One took 15 minutes to render and Video Two 18 on four cores.
- Captures: `scripts/marketing/capture/plan.mjs` (the `sc-*` entries), `run.mjs`, then `scripts/marketing/screens.mjs`.
- Showcase: `scripts/marketing/video/reels/showcase/run.mjs`. Campaign: `scripts/marketing/campaign/build.mjs` and `posts.mjs`.
- The earlier film engine and the first launch film are untouched; the engine gained a `--reel` option.

## Decisions to know about

- **No voiceover.** No speech key was available, so the words are on screen and the sound is original music plus sound cues. A voiceover can be added later on the same timeline.
- **Video Two separates current from coming** with badges: Live now, Rolling out (wallet, rewards, calls from the chat), In development (table deposits), Direction (assistant finishing tasks, the longer-term vision). No dates, no guarantees, no provider names.
- **Listings, stays and restaurants are the platform's own example stock**, as labelled on the screens. No testimonials, counts or totals anywhere.
- **Both films and the campaign end with "iPhone and Android apps coming soon"** because both apps are in store review. No "download" claims.

## Limits and what remains

- **Workspaces show empty states.** The QA member has no listings, rooms, reservations or payments, and nothing was added to production to fill them. The agent, host, rooms, calendar and reservations screens are real but empty. Seeding a test host and agent account would make Video Two's workspace scenes much stronger.
- **Left out on purpose:** the wallet setup screen (names the payments provider), the local feed (its only post is the founder's own), the assistant's long answer (raw markdown asterisks show, a product bug), admin screens (no admin login in the harness), maps (tiles blocked here).
- **Not verifiable from here:** calls (badged Rolling out), wallet and rewards payouts (the rewards screen itself says withdrawals are not open yet). Confirm both on production before posting campaign post 16 (rewards).
- **Small flaws:** in Video Two around 3:15 the map outline sits close to the word "spaces."; the dark/light campaign post has its icon touching a phone on the X size.
- **Admin and operations tools** and **maps** are not in the films.
- **Two QA passwords were pasted in chat** (HANDOFF section 6): rotate them.
