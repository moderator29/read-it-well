"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatNumber, type Locale } from "@vallo/i18n";
import Link from "next/link";
import { ProfilePosts } from "@/components/social/profile/ProfilePosts";
import type { PostView } from "@/components/social/feed/PostCard";
import { EmptyState } from "@/components/app/Screen";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
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
 * The tab strip is the social layer's own glass capsule (`nf-glass-seg`), the
 * one the feed and the public page wear too, so moving between your account
 * and your page does not change what a tab looks like halfway through.
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
  /** The Belongings tab and its four rows, per `50E032EA`. */
  belongings: string;
  posts: string;
  myBookings: string;
  myBookingsSub: string;
  savedSub: string;
  walletSub: string;
  inspections: string;
  inspectionsSub: string;
};

type Tab = "account" | "posts";

/**
 * A belongings row: a glass card, a glass tile with the brand object, the
 * title, the line under it, a chevron. The whole row is the link.
 */
function BelongingRow({
  href,
  icon,
  title,
  sub,
  testId,
}: {
  href: string;
  icon: BrandIconName;
  title: string;
  sub: string;
  testId?: string;
}) {
  return (
    <Link href={href} className="nf-card nf-belong__row" data-testid={testId}>
      {/*
        THE OBJECT IS THE TILE'S SIZE, AND THE ROW DREW TWO TILES UNTIL IT WAS.
        Every object named below draws its own rounded-square glass ground, and
        `.nf-belong__tile` draws one too, with the shared lit edge. At 32 inside
        44 the two did not coincide, so each row shipped a bright square with a
        second dimmer square nested in it. `50E032EA` draws ONE tile per row.
        At the tile's own size the artwork's ground lands under the row's lit
        edge and the two read as the single object the render draws.
      */}
      <span className="nf-belong__tile" aria-hidden="true">
        <BrandIcon name={icon} size={44} />
      </span>
      <span className="nf-belong__body">
        <span className="nf-belong__title">{title}</span>
        <span className="nf-belong__sub">{sub}</span>
      </span>
      <UiIcon name="chevron-right" size={20} className="nf-belong__chev" />
    </Link>
  );
}

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
  roleSwitch,
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
  /** The Switch role row, built by the page so this stays a plain client
      component: the existing `RoleSwitcher`, wearing the belongings card. */
  roleSwitch?: React.ReactNode;
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

  const tabs: { key: Tab; label: string; icon: "home" | "chat-bubble" }[] = [
    { key: "account", label: copy.belongings, icon: "home" },
    { key: "posts", label: copy.posts, icon: "chat-bubble" },
  ];

  return (
    /* `mt-group`, not `mt-lg`: `50E032EA` sets the capsule directly under the
       counts, and at lg the quiet link row above it plus the gap left most of
       a thumb of empty canvas between the person and their belongings. */
    <div className="mt-group">
      {/* Belongings / Posts: the glass capsule the render draws, and the same
          object the feed's For you / Following and the public page's tabs
          wear, so a tab is one thing across the whole social layer. */}
      <div
        role="tablist"
        aria-label="Your account"
        className="nf-glass-seg"
        style={{ "--nf-seg-count": tabs.length } as React.CSSProperties}
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
            className="nf-glass-seg__tab"
            data-testid={`account-tab-${entry.key}`}
          >
            <UiIcon name={entry.icon} size={20} />
            {entry.label}
          </button>
        ))}
      </div>

      {tab === "account" ? (
        <div
          role="tabpanel"
          id="account-panel-account"
          aria-labelledby="account-tab-account"
          className="space-y-lg pt-lg"
        >
          {/*
            The four belongings, as drawn: bookings, saved, wallet,
            inspections, then the role switch. Everything else a person has
            here follows in the quieter groups under them, so nothing that
            used to be reachable from this page has gone.

            THE FOUR OBJECTS ARE THE RENDER'S FOUR, AND THEY WERE NOT BEFORE.
            `50E032EA` draws every one of these rows as a white line drawing
            inside a quiet glass tile: a calendar, a BOOKMARK, a wallet, a
            ticked shield, and a person-with-a-mark on the role switch under
            them. This column carried `calendar-check`, `heart-home`, `wallet`
            and `shield-check`, which are the pack's SOLID modelled objects:
            one family, so rule 5 held, but a hotter and more saturated family
            than the render's, and four bright blue objects where the image
            has four quiet ones. The pack already holds the render's own four
            under `calendar-grid`, `bookmark-ribbon`, `wallet-tile` and
            `shield-check-tile`, so this is a name change rather than new
            artwork, and it is the same finding the settings hub closed under
            A13: the tier was never mixed in code, the ARTWORK was the wrong
            family.

            Saved takes the bookmark and not the heart because the render
            draws a bookmark in this row. The dock keeps its heart, which is
            also what the render's dock draws.
          */}
          <div className="nf-belong" data-testid="belongings">
            <BelongingRow
              href="/bookings"
              icon="calendar-grid"
              title={copy.myBookings}
              sub={copy.myBookingsSub}
              testId="row-bookings"
            />
            <BelongingRow
              href="/saved"
              icon="bookmark-ribbon"
              title={copy.saved}
              sub={copy.savedSub}
            />
            <BelongingRow
              href="/wallet"
              icon="wallet-tile"
              title={copy.wallet}
              sub={copy.walletSub}
            />
            <BelongingRow
              href="/inspections"
              icon="shield-check-tile"
              title={copy.inspections}
              sub={copy.inspectionsSub}
            />
            {roleSwitch ? (
              <div className="nf-card nf-belong__switch">{roleSwitch}</div>
            ) : null}
          </div>

          <SettingsGroup label="What you have here">
            <RowLink
              href="/reviews"
              icon="star"
              label="Reviews"
              value={formatCount(counts.reviews)}
            />
            <RowLink
              href="/bookings"
              icon="calendar-booking"
              label={copy.bookings}
              value={formatCount(counts.trips)}
            />
            <RowLink
              href="/saved"
              icon="heart"
              label={copy.saved}
              value={formatCount(counts.saved)}
            />
          </SettingsGroup>

          <SettingsGroup label="Messages">
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

          <SettingsGroup
            label="You"
            note="Photos are re-encoded on your phone before they are uploaded, so the location tag a camera writes never leaves it."
          >
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
              offers Listing or selling and Agent or estate manager, with an
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
          className="pt-lg"
        >
          {handle === null ? (
            <EmptyPanel
              icon="user-verified"
              title="Claim a handle and this fills up"
              body="A handle is your address on Vallo. Everything you write around a place collects here once you have one."
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
      <form action={formAction} noValidate id="account-details-form" className="space-y-md">
        <div className="grid gap-md sm:grid-cols-2">
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
            className="rounded-[var(--nf-radius-md)] border border-[color-mix(in_oklab,var(--nf-state-error)_45%,transparent)] px-md py-sm text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-state-error)]"
          >
            {state.error}
          </p>
        )}

        <p className="text-[length:var(--nf-text-overline)] leading-relaxed text-[var(--nf-content-muted)]">
          Your name is what hosts see when you message or book. Your phone number stays
          private to you and the platform.
        </p>
      </form>

      <div className="pt-2xs">
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
      <span className="nf-label mb-2xs block">
        {label}
        {optional && (
          <span className="ml-2xs font-normal text-[var(--nf-content-muted)]">(optional)</span>
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
      {error && <span className="mt-2xs block text-[length:var(--nf-text-overline)] text-[var(--nf-state-error)]">{error}</span>}
    </label>
  );
}
