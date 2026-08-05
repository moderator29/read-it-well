/**
 * The contact form's topics.
 *
 * They live in `lib/trust/support-topics.ts` because the admin support queue
 * needs the same list to render what somebody chose and to put the right clock
 * on the ticket. This file exists so the form keeps a local name for them, and
 * because a constant re-exported from a "use client" module is a client
 * reference rather than a value: `CONTACT_TOPICS.find` typechecked, built clean
 * and threw "is not a function" on the first request to /contact when it lived
 * inside ContactForm.tsx.
 */

export {
  SUPPORT_TOPICS as CONTACT_TOPICS,
  DEFAULT_SUPPORT_TOPIC as DEFAULT_CONTACT_TOPIC,
  SUPPORT_TOPIC_LABEL as CONTACT_TOPIC_LABEL,
  type SupportTopic as ContactTopic,
} from "@/lib/trust/support-topics";
