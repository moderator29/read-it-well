"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatNumber, type Locale } from "@naijafinds/i18n";
import { ProfilePosts } from "@/components/social/profile/ProfilePosts";
import type { PostView } from "@/components/social/feed/PostCard";
import { EmptyState } from "@/components/app/Screen";
import {
  RowButton,
  RowLink,
  RowValue,
  SettingsGroup,
  Sheet,
} from "@/components/app/account/rows";
import { updateProfileAction, type ProfileSaved } from "@/lib/profile/actions";
import {
  MAX_NAME_LENGTH,
  MAX_NICKNAME_LENGTH,
  MAX_PHONE_LENGTH,
} from "@/lib/profile/schema";
import type { ActionResult } from "@/lib/actions/envelope";

/**
 * Everything under your own identity: what you have done here, and where the
 * rest of your account lives.
 *
 * Two tabs, and only two, because there are only two honest ones. **Account**
 * is every destination that belongs to you, as grouped rows. **Posts** is what
 * you have actually written. A third tab that could only ever be empty tells
 * somebody with forty of something that they have none, which is the mistake
 * the social profile already learned once and wrote down.
 *
 * The tab strip is the social layer's own `nf-social-tab`, not a second one
 * built for this screen, so moving between your account and your page does not
 * change what a tab looks like halfway through.
 *
 * The rows replaced a grid of seven square tiles. The tiles looked tidy in a
 * mockup and read badly on a phone: seven equal boxes give equal weight to
 * "Trips" and "Settings", so the eye has to read all seven every time to find
 * one. A list has an order, and each row can carry its own count on the right,
 * which is the thing somebody actually came to check.
 *
 * Your name and phone open in a sheet rather than expanding the page. An
 * inline form pushed everything below it down by a screen and a half, so the
 * thing you were about to tap moved while you were reaching for it.
 */

export type AccountCounts = { trips: number; saved: number; reviews: number };

export type AccountRowsCopy = {
  bookings: string;
  saved: string;
  wallet: string;
  messages: string;
  settings: string;
};

type Tab = "account" | "posts";

export function AccountBody({
  counts,
  copy,
  email,
  placeLabel,
  occupationName,
  details,
  posts,
  handle,
  hasBio,
  locale,
}: {
  counts: AccountCounts;
  copy: AccountRowsCopy;
  email: string;
  placeLabel: string;
  occupationName: string;
  details: { firstName: string; surname: string; nickname: string; phone: string };
  /** The person's own posts. Empty when they have not claimed a handle. */
  posts: PostView[];
  handle: string | null;
  /** Drives the owner's first useful action while the Posts tab is empty. */
  hasBio: boolean;
  /**
   * The locale, NOT a formatter.
   *
   * This used to take `formatCount: (value: number) => string`, built in the
   * server component above and handed down. That is a function crossing the
   * server/client boundary, which React refuses outright: it throws
   * "Functions cannot be passed directly to Client Components" while rendering,
   * and the whole page answers 500. Nothing in the database was wrong, which is
   * why every probe of every query on this page came back clean. The signed-out
   * branch returns before this component is ever reached, so every spec passed
   * and only a real signed-in person ever saw it.
   *
   * A locale is a string. It crosses fine, and the formatting happens here.
   */
  locale: Locale;
}) {
  const [tab, setTab] = useState<Tab>("account");
  const [editing, setEditing] = useState(false);
  const formatCount = (value: number) => formatNumber(value, locale);

  const tabs: { key: Tab; label: string }[] = [
    { key: "account", label: "Account" },
    { key: "posts", label: "Posts" },
  ];

  return (
    <div className="mt-6">
      {/* The strip scrolls horizontally on purpose even at two tabs: it is the
          same component shape as the public page, which has six, and a strip
          that reflows at one width and scrolls at another is two components
          pretending to be one. */}
      <div
        role="tablist"
        aria-label="Your account"
        className="-mx-4 flex gap-1 overflow-x-auto border-b border-[var(--nf-border-subtle)] px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0"
      >
        {tabs.map((entry) => (
          <button
            key={entry.key}
            type="button"
            role="tab"
            id={`account-tab-${entry.key}`}
            aria-selected={tab === entry.key}
            aria-controls={`account-panel-${entry.key}`}
            onClick={() => setTab(entry.key)}
            className="nf-social-tab"
            data-testid={`account-tab-${entry.key}`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === "account" ? (
        <div
          role="tabpanel"
          id="account-panel-account"
          aria-labelledby="account-tab-account"
          className="space-y-6 pt-5"
        >
          <SettingsGroup label="What you have here">
            <RowLink
              href="/bookings"
              icon="calendar-booking"
              label={copy.bookings}
              value={formatCount(counts.trips)}
              testId="row-bookings"
            />
            <RowLink
              href="/saved"
              icon="heart"
              label={copy.saved}
              value={formatCount(counts.saved)}
            />
            <RowLink
              href="/reviews"
              icon="star"
              label="Reviews"
              value={formatCount(counts.reviews)}
            />
          </SettingsGroup>

          <SettingsGroup label="Money and messages">
            <RowLink
              href="/wallet"
              icon="wallet"
              label={copy.wallet}
              sub="Balance and payments"
            />
            <RowLink
              href="/messages"
              icon="chat-bubble"
              label={copy.messages}
              sub="Chats with hosts"
            />
            <RowLink
              href="/notifications"
              icon="bell"
              label="Notifications"
              sub="Everything that happened while you were away"
            />
          </SettingsGroup>

          <SettingsGroup label="You">
            <RowButton
              onClick={() => setEditing(true)}
              icon="user"
              label="Your details"
              sub="Name, nickname and phone number"
              testId="row-details"
            />
            <RowValue icon="settings-gear" label="Email" value={email} />
            <RowLink
              href="/settings/place"
              icon="location"
              label="Where you are"
              value={placeLabel || "Not set"}
            />
            <RowLink
              href="/settings/place"
              icon="key"
              label="What you do"
              value={occupationName || "Not set"}
            />
          </SettingsGroup>

          <SettingsGroup label="More">
            <RowLink
              href="/settings"
              icon="sliders"
              label={copy.settings}
              sub="Appearance, notifications, privacy and data"
            />
            {/*
              THE "BECOME AN AGENT" ROW IS GONE, and nothing replaced it here
              on purpose.

              It pointed at `/agents`, a marketing page that no longer exists,
              and it was the SECOND door to it on this one screen: the switch-
              profile control sits at the very top of the profile and already
              offers Listing or selling and Agent or realtor, with an
              explanation and the setup behind each. A row at the bottom of
              More saying the same thing in different words is the "twenty
              pages by twenty people" problem in miniature.
            */}
            <RowLink href="/help" icon="ticket" label="Help" sub="Get an answer from a person" />
          </SettingsGroup>
        </div>
      ) : (
        <div
          role="tabpanel"
          id="account-panel-posts"
          aria-labelledby="account-tab-posts"
          className="pt-5"
        >
          {handle === null ? (
            <EmptyPanel
              icon="user-verified"
              title="Claim a handle and this fills up"
              body="A handle is your address on RentMe. Everything you write around a place collects here once you have one."
            />
          ) : (
            /* The public page's own panel, not a second one built for this
               screen. A post has to look and behave the same wherever it is
               read, and the empty copy for somebody's own page is already
               written there. */
            <ProfilePosts
              tab="posts"
              handle={handle}
              posts={posts}
              isOwner
              signedIn
              hasBio={hasBio}
              labelledBy="account-tab-posts"
            />
          )}
        </div>
      )}

      <DetailsSheet open={editing} onClose={() => setEditing(false)} details={details} />
    </div>
  );
}

/**
 * The profile's own empty tab.
 *
 * Was a fourth distinct shape: a card, a 56px object and a 1rem title, against
 * the social layer's 80px and the property side's 64px. It is the platform's
 * one `EmptyState` now, so the Posts tab of your own profile and the Saved
 * screen you reach from the same rail no longer look like two products.
 */
function EmptyPanel({
  icon,
  title,
  body,
}: {
  icon: "chat" | "user-verified";
  title: string;
  body: string;
}) {
  return <EmptyState icon={icon} title={title} body={body} />;
}

/* ------------------------------------------------------------------ sheet */

function DetailsSheet({
  open,
  onClose,
  details,
}: {
  open: boolean;
  onClose: () => void;
  details: { firstName: string; surname: string; nickname: string; phone: string };
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionResult<ProfileSaved> | null, FormData>(
    updateProfileAction,
    null,
  );

  const [firstName, setFirstName] = useState(details.firstName);
  const [surname, setSurname] = useState(details.surname);
  const [nickname, setNickname] = useState(details.nickname);
  const [phone, setPhone] = useState(details.phone);

  // A successful save closes the sheet and refreshes the tree, so every other
  // surface showing this name agrees before the sheet has finished leaving.
  useEffect(() => {
    if (!state?.ok) return;
    setFirstName(state.data.firstName);
    setSurname(state.data.surname);
    setNickname(state.data.nickname);
    setPhone(state.data.phone);
    onClose();
    router.refresh();
  }, [state, onClose, router]);

  const fieldError = (key: string): string | undefined =>
    state && !state.ok ? state.fieldErrors?.[key] : undefined;

  return (
    <Sheet open={open} onClose={onClose} title="Your details">
      <form action={formAction} noValidate id="account-details-form" className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="firstName"
            label="First name"
            value={firstName}
            onChange={setFirstName}
            error={fieldError("firstName")}
            maxLength={MAX_NAME_LENGTH}
            autoComplete="given-name"
          />
          <Field
            name="surname"
            label="Surname"
            value={surname}
            onChange={setSurname}
            error={fieldError("surname")}
            maxLength={MAX_NAME_LENGTH}
            autoComplete="family-name"
          />
        </div>

        <Field
          name="nickname"
          label="Nickname"
          value={nickname}
          onChange={setNickname}
          error={fieldError("nickname")}
          maxLength={MAX_NICKNAME_LENGTH}
          autoComplete="nickname"
          placeholder="What friends call you"
          optional
        />

        <Field
          name="phone"
          label="Phone number"
          value={phone}
          onChange={setPhone}
          error={fieldError("phone")}
          maxLength={MAX_PHONE_LENGTH}
          autoComplete="tel"
          inputMode="tel"
          placeholder="0803 123 4567"
          optional
        />

        {state && !state.ok && !state.fieldErrors && (
          <p
            role="alert"
            className="rounded-[var(--nf-radius-md)] border border-[color-mix(in_oklab,var(--nf-state-error)_45%,transparent)] px-3.5 py-2.5 text-[0.8125rem] leading-relaxed text-[var(--nf-state-error)]"
          >
            {state.error}
          </p>
        )}

        <p className="text-[0.75rem] leading-relaxed text-[var(--nf-content-muted)]">
          Your name is what hosts see when you message or book. Your phone number stays
          private to you and the platform.
        </p>
      </form>

      <div className="pt-1">
        <button
          type="submit"
          form="account-details-form"
          disabled={pending}
          className="nf-btn nf-btn--primary w-full"
          data-testid="account-details-save"
        >
          {pending ? "Saving" : "Save"}
        </button>
      </div>
    </Sheet>
  );
}

function Field({
  name,
  label,
  value,
  onChange,
  error,
  maxLength,
  autoComplete,
  inputMode,
  placeholder,
  optional,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  error?: string;
  maxLength: number;
  autoComplete?: string;
  inputMode?: "tel" | "text";
  placeholder?: string;
  optional?: boolean;
}) {
  return (
    <label className="block">
      <span className="nf-label mb-1.5 block">
        {label}
        {optional && (
          <span className="ml-1 font-normal text-[var(--nf-content-muted)]">(optional)</span>
        )}
      </span>
      <input
        name={name}
        type="text"
        value={value}
        maxLength={maxLength}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        className="nf-field"
      />
      {error && <span className="mt-1.5 block text-[0.75rem] text-[var(--nf-state-error)]">{error}</span>}
    </label>
  );
}
