# Video calling: open questions

Each needs a decision from the founder, the lead, legal or a real device.
The default VC1 chose is stated, so nothing is blocked while it is answered.

## Product

1. **No cold calls.** VC1 lets a person call only after the other has written
   in the thread at least once (anti-harassment, anti-spam). Should an
   agent or business be able to call an enquirer who has only sent the first
   message? (Today: yes, because the enquirer wrote.) Should a guest be able
   to call a business that has never replied? (Today: no.)
2. **Quiet hours.** An incoming call is not "urgent", so during a person's
   quiet hours the push is held past its 45 s life and never sent; the call
   shows as missed in the morning. Should calls ring through quiet hours?
   (One line in `lib/push/policy.ts`: treat the incoming-call path as urgent.)
3. **Push collapse.** Call pushes share the `vallo-message` collapse tag, so
   an incoming call replaces a pending message notification on the lock
   screen. Give calls their own tag?
4. **Who answers for a firm.** Calls go to the conversation's `agent_id`; a
   firm's routed agent (`routed_agent_id`) is not rung. Should a call ring the
   routed agent instead, or both?
5. **Business workspaces.** A business conversation rings the business owner
   only, not staff in a workspace. Multi-device and team ringing are later.
6. **Space walkthroughs, scheduled viewings, group calls** (brief stage 4):
   not built. The schema carries `listing_id` and `business_id` context
   already; scheduling a walkthrough would reuse the review-call scheduling
   pattern on conversation calls.
7. **Reports as a review case.** For a `reports` row, is the subject the
   reporter or the reported account? Not a case kind until decided.
8. **Report from the call screen.** Today a person reports through the thread.
   Add a report entry point on the call screen (with the call id)?
9. **Caller waits in the room.** The caller joins the media room while it
   rings (faster connect, about 45 participant-seconds of cost per unanswered
   call). Keep, or join only on answer?

## Legal and privacy (see SECURITY-PRIVACY.md)

10. NDPA lawful basis, DPIA, cross-border transfer for LiveKit Cloud media
    (nearest region South Africa), DPA with LiveKit.
11. Retention periods proposed for calls, events, provider events and review
    entries; the purge for `call_provider_events` is not written.
12. Privacy notice and store data-safety forms (camera and microphone used
    for calls, not stored).

## Operations and cost

13. Which LiveKit Cloud plan: Build (free, 5,000 participant-minutes as
    extracted) for the pilot, Ship ($50) at launch? Billing alerts in the
    LiveKit dashboard at what threshold?
14. Region: LiveKit Cloud routes to the nearest region automatically; region
    pinning needs the Scale plan. Measure Lagos and Abuja latency on MTN,
    Airtel and Glo before choosing.
15. Usage reconciliation: `reconciled_participant_seconds` exists but nothing
    fills it; LiveKit's usage export or analytics API would. Who owns that job?
16. Provider quality metrics (packet loss, jitter, MOS) are not collected;
    `call_usage_summary` reports setup time, connect rate and reconnects from
    Vallo's own facts. Add LiveKit's analytics later?

## Native

17. CallKit / ConnectionService / VoIP push: a separate native project. When?
18. Android photo capture now asks for the camera permission once (side effect
    of declaring CAMERA for calls). Acceptable? (VC1 assumes yes.)
19. The release builds for both platforms have never been made in this
    sandbox; who runs the device list in MOBILE-COMPATIBILITY.md, and when?
