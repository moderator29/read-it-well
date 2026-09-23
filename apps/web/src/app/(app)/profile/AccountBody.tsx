"use client";

import "./profile.css";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatNumber, type Locale } from "@vallo/i18n";
import Link from "next/link";
import { ProfilePosts } from "@/components/social/profile/ProfilePosts";
import type { PostView } from "@/components/social/feed/PostCard";
import { EmptyState } from "@/components/app/Screen";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
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
import { accountCopy, NO_FACTS, rowValue, type BelongingsFacts } from "./belongings";
import { SwitchRoleRow } from "./SwitchRoleRow";
import { COVER_INPUT_ID } from "./AccountHero";

/**
 * EVERYTHING UNDER YOUR OWN IDENTITY, BUILT TO `50E032EA`.
 *
 * The render, measured (ledger section 1): a two-segment glass control,
 * Belongings with a house glyph lit in blue and Posts with a chat glyph on the
 * glass, 20px under it four glass rows 66px tall on an 8px rhythm, each a
 * 49px glass plate carrying the render's own object, a title, a muted line and a
 * chevron, then a larger gap and a quieter Switch role row, 60px tall.
 *
 * WHAT IS REAL ON EACH ROW. The rows are links to the real routes
 * (`/bookings`, `/saved`, `/wallet`, `/inspections`). The render draws no
 * figures on them; the brief for this surface allows one where the database
 * returns it, so each row may carry a quiet value on its right: upcoming
 * stays, saved places, the wallet balance through the shared money formatter,
 * open inspection requests. A figure the read could not produce is not drawn
 * at all, and a zero count is not drawn either (see `rowValue`).
 *
 * NOTHING THE PAGE USED TO REACH HAS GONE. The render ends at Switch role
 * because the dock is under it; below the fold the rest of the account keeps
 * its rows: editing the profile, the public page, your details, where you are
 * and what you do, reviews, messages, notifications and help.
 *
 * Posts is the public page's own panel (`ProfilePosts`), reading the same
 * `getProfileFeed` rows, so a post looks the same wherever it is read and an
 * empty tab says the same honest thing.
 */

export type AccountCounts = { trips: number; saved: number; reviews: number };

export type AccountRowsCopy = {
  bookings: string;
  saved: string;
  wallet: string;
  messages: string;
  settings: string;
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

type Belonging = {
  key: "bookings" | "saved" | "wallet" | "inspections";
  href: string;
  /** The render's own object, cropped from `50E032EA` into the glass pack. */
  object: BrandIconName;
  title: string;
  sub: string;
};

/**
 * A belongings row: the glass container, the plate with its glyph, the title,
 * the line under it, the value when there is one, the chevron. The whole row
 * is the link.
 */
function BelongingRow({ row, value }: { row: Belonging; value: string | null }) {
  return (
    <Link href={row.href} className="nf-pf-row" data-testid={`row-${row.key}`}>
      <span className="nf-pf-plate" aria-hidden="true">
        <span className="nf-pf-plate__object">
          <BrandIcon name={row.object} size={68} />
        </span>
      </span>
      <span className="nf-pf-row__body">
        <span className="nf-pf-row__title">{row.title}</span>
        <span className="nf-pf-row__sub">{row.sub}</span>
      </span>
      {value ? (
        <span className="nf-pf-row__value nf-numeric" data-testid={`row-${row.key}-value`}>
          {value}
        </span>
      ) : null}
      <UiIcon name="chevron-right" size="sm" className="nf-pf-row__chev" />
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
  facts = NO_FACTS,
  switchLine,
  memberSince,
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
  /** The locale, NOT a formatter: a function cannot cross into a client component. */
  locale: Locale;
  /** What the four rows can honestly say about themselves. */
  facts?: BelongingsFacts;
  /** The line under Switch role, built from the workspaces this account holds. */
  switchLine?: string;
  /** "Month Year", already worded by the page. */
  memberSince?: string;
  /**
   * The old role switch row. Accepted for callers that still pass it and no
   * longer drawn: Switch role now opens the workspace sheet the dock opens.
   */
  roleSwitch?: React.ReactNode;
}) {
  const COPY = accountCopy(locale);
  const [tab, setTab] = useState<Tab>("account");
  const [editing, setEditing] = useState(false);
  const formatCount = (value: number) => formatNumber(value, locale);

  const tabs: { key: Tab; label: string; icon: UiIconName }[] = [
    { key: "account", label: copy.belongings, icon: "home" },
    { key: "posts", label: copy.posts, icon: "chat-bubble" },
  ];

  /*
   * THE FOUR OBJECTS ARE THE RENDER'S FOUR, cropped from `50E032EA` itself
   * into the glass pack (`scripts/icon-manifest.mjs`, the profile block):
   * a calendar, a bookmark, a wallet, a ticked shield. Saved takes the
   * bookmark and not the heart because the render draws a bookmark here.
   */
  const rows: Belonging[] = [
    {
      key: "bookings",
      href: "/bookings",
      object: "calendar-grid",
      title: copy.myBookings,
      sub: copy.myBookingsSub,
    },
    {
      key: "saved",
      href: "/saved",
      object: "bookmark-ribbon",
      title: copy.saved,
      sub: copy.savedSub,
    },
    {
      key: "wallet",
      href: "/wallet",
      object: "wallet-tile",
      title: copy.wallet,
      sub: copy.walletSub,
    },
    {
      key: "inspections",
      href: "/inspections",
      object: "shield-check-tile",
      title: copy.inspections,
      sub: copy.inspectionsSub,
    },
  ];

  return (
    <div className="nf-pf-body">
      <div role="tablist" aria-label="Your account" className="nf-pf-tabs">
        {tabs.map((entry) => (
          <button
            key={entry.key}
            type="button"
            role="tab"
            id={`account-tab-${entry.key}`}
            aria-selected={tab === entry.key}
            aria-controls={`account-panel-${entry.key}`}
            onClick={() => setTab(entry.key)}
            className="nf-pf-tab"
            data-testid={`account-tab-${entry.key}`}
          >
            <UiIcon name={entry.icon} size="md" />
            {entry.label}
          </button>
        ))}
      </div>

      {tab === "account" ? (
        <div
          role="tabpanel"
          id="account-panel-account"
          aria-labelledby="account-tab-account"
          className="nf-pf-panel"
        >
          <div className="nf-pf-rows" data-testid="belongings">
            {rows.map((row) => (
              <BelongingRow key={row.key} row={row} value={rowValue(row.key, facts, locale)} />
            ))}
          </div>

          <div className="nf-pf-switch">
            <SwitchRoleRow line={switchLine ?? COPY.switchNone} title={COPY.switchTitle} />
          </div>

          <div className="nf-pf-more">
            <SettingsGroup label={COPY.more}>
              {handle ? (
                <>
                  <RowLink
                    href={`/u/${handle}/edit`}
                    icon="settings-gear"
                    label={COPY.editProfile}
                    sub={COPY.editProfileSub}
                  />
                  <RowLink
                    href={`/u/${handle}`}
                    icon="link"
                    label={COPY.publicPage}
                    sub={COPY.publicPageSub}
                    testId="account-public-page"
                  />
                  <RowButton
                    onClick={() => document.getElementById(COVER_INPUT_ID)?.click()}
                    icon="picture"
                    label={COPY.coverPhoto}
                    sub={COPY.coverPhotoSub}
                    testId="account-cover-button"
                  />
                </>
              ) : null}
              <RowButton
                onClick={() => setEditing(true)}
                icon="user"
                label="Your details"
                sub="Name, nickname and phone number"
                testId="row-details"
              />
              <RowValue
                icon="mail"
                label="Email"
                value={email}
                sub="Your email address cannot be changed."
              />
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
              {memberSince ? (
                <RowValue icon="calendar-booking" label={COPY.memberSince} value={memberSince} />
              ) : null}
            </SettingsGroup>

            <SettingsGroup
              label={COPY.activity}
              note="Photos are re-encoded on your phone before they are uploaded, so the location tag a camera writes never leaves it."
            >
              <RowLink
                href="/reviews"
                icon="star"
                label="Reviews"
                value={counts.reviews > 0 ? formatCount(counts.reviews) : undefined}
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
              <RowLink href="/help" icon="ticket" label="Help" sub="Get an answer from a person" />
            </SettingsGroup>
          </div>
        </div>
      ) : (
        <div
          role="tabpanel"
          id="account-panel-posts"
          aria-labelledby="account-tab-posts"
          className="nf-pf-panel"
        >
          {handle === null ? (
            <EmptyState
              icon="user-verified"
              title="Claim a handle and this fills up"
              body="A handle is your address on Vallo. Everything you write around a place collects here once you have one."
            />
          ) : (
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
