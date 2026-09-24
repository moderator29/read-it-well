-- V-09: THE PASTED BROADCAST MAY ASK A MODEL FOR HELP ONLY WHEN SWITCHED ON.
--
-- "Paste your broadcast" reads the agent's WhatsApp message with a
-- deterministic reader (`apps/web/src/lib/agent/broadcast.ts`) that needs no
-- model and no key. A second, optional reader may point at spans the first
-- one missed, only when ANTHROPIC_API_KEY and ASSISTANT_MODEL are set AND this
-- row says true. It fails closed: no row, an error or false means the
-- deterministic reader alone, which costs nothing per paste.
--
-- Born off, so no model call is made per paste until somebody decides the
-- cost is worth it:
--   update public.feature_flags set enabled = true where key = 'broadcast_model';

insert into public.feature_flags (key, enabled, note)
values ('broadcast_model', false,
        'V-09 paste your broadcast: allow the assistant model to point at spans the deterministic reader missed. Spans only, never figures; money is always worked out in integer kobo by the reader. Off: the deterministic reader alone.')
on conflict (key) do nothing;
