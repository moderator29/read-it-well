"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { formatMoney, type Dictionary, type Locale } from "@vallo/i18n/core";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { StatusBar, type StatusSegment } from "@/components/ui/charts/StatusBar";
import { UiIcon } from "@/design-system/icons/UiIcon";
import {
  bpsLabel,
  CALCULATOR_STATES,
  computeMoveIn,
  FEE_LINES,
  publishedRule,
  queryFromInput,
  type FeeInput,
  type FeeLine,
  type MoveInInput,
} from "@/lib/site/move-in-calculator";

type Copy = Dictionary["publicDoors"]["moveIn"];

const LINE_TONES: Record<"rent" | FeeLine, StatusSegment["tone"]> = {
  rent: "brand",
  agency: "info",
  legal: "neutral",
  caution: "success",
  agreement: "warning",
  service: "error",
};

/**
 * A8. The move-in calculator at `/move-in-cost`.
 *
 * Every figure is typed by the visitor; the only one Vallo offers is a
 * published rule's maximum (Lagos today), filled in only on a tap and labelled
 * as the most the rule allows. The arithmetic is `computeMoveIn`, which runs
 * the listing's own `cashAtDoor`. The page renders the result for the query
 * it was opened with (a shared link opens on the same total), and this
 * component updates it as the visitor types.
 */
export function MoveInCalculator({
  copy,
  locale,
  initial,
  initialState,
  origin,
}: {
  copy: Copy;
  locale: Locale;
  initial: MoveInInput;
  initialState: string;
  origin: string;
}) {
  const id = useId();
  const [rent, setRent] = useState(initial.rent);
  const [years, setYears] = useState(String(initial.years) as "1" | "2" | "3");
  const [state, setState] = useState(initialState);
  const [fees, setFees] = useState<Partial<Record<FeeLine, FeeInput>>>(initial.fees);
  const [copied, setCopied] = useState(false);

  const input: MoveInInput = useMemo(() => ({ rent, years: Number(years), fees }), [rent, years, fees]);
  const result = computeMoveIn(input);
  const rule = publishedRule(state);
  const query = queryFromInput(input, state);

  /* The address bar follows the figures, so a copied or bookmarked address
     opens the same total. `replaceState` so typing writes no history. */
  useEffect(() => {
    const url = `${window.location.pathname}${query}`;
    window.history.replaceState(window.history.state, "", url);
  }, [query]);

  const setFee = (key: FeeLine, patch: Partial<FeeInput>) =>
    setFees((prev) => ({ ...prev, [key]: { mode: prev[key]?.mode ?? "amount", value: prev[key]?.value ?? "", ...patch } }));

  const lineLabel = (key: "rent" | FeeLine) =>
    key === "rent" && Number(years) > 1 ? copy.lines.rentYears.replace("{years}", years) : copy.lines[key];

  const money = (minor: number) => formatMoney(minor, locale);
  const shareUrl = `${origin.replace(/\/+$/, "")}/move-in-cost${query}`;

  async function share() {
    if (result.state !== "ok") return;
    const text = copy.shareText
      .replace("{rent}", money(result.rentMinor))
      .replace("{total}", money(result.totalMinor))
      .replace("{url}", shareUrl);
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ text });
        return;
      } catch {
        /* Dismissed or refused: fall through to WhatsApp. */
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      setCopied(false);
    }
  }

  const invalid = result.state === "invalid" ? result.field : null;

  return (
    <div className="nf-calc">
      <form method="get" action="/move-in-cost" className="nf-pd-card nf-calc__form" onSubmit={(e) => e.preventDefault()}>
        <div className="nf-calc__field">
          <label htmlFor={`${id}-rent`} className="nf-label">
            {copy.rentLabel}
          </label>
          <div className="nf-calc__money">
            <span className="nf-calc__currency" aria-hidden="true">
              ₦
            </span>
            <input
              id={`${id}-rent`}
              name="rent"
              className="nf-field nf-calc__input nf-numeric"
              inputMode="decimal"
              autoComplete="off"
              placeholder={copy.rentPlaceholder}
              value={rent}
              onChange={(e) => setRent(e.target.value.slice(0, 18))}
              aria-invalid={invalid === "rent" || undefined}
              aria-describedby={`${id}-rent-hint`}
              data-testid="calc-rent"
            />
          </div>
          <p id={`${id}-rent-hint`} className="nf-caption text-[var(--nf-content-muted)]">
            {invalid === "rent" ? copy.invalid : copy.rentHint}
          </p>
        </div>

        <div className="nf-calc__row">
          <div className="nf-calc__field">
            <span className="nf-label" id={`${id}-years`}>
              {copy.upfrontLabel}
            </span>
            <input type="hidden" name="years" value={years} />
            <Segmented
              semantics="radio"
              label={copy.upfrontLabel}
              value={years}
              onChange={setYears}
              full
              options={[
                { value: "1", label: copy.upfrontOne },
                { value: "2", label: copy.upfrontTwo },
                { value: "3", label: copy.upfrontThree },
              ]}
            />
          </div>
          <div className="nf-calc__field">
            <label htmlFor={`${id}-state`} className="nf-label">
              {copy.stateLabel}
            </label>
            <select
              id={`${id}-state`}
              name="state"
              className="nf-field"
              value={state}
              onChange={(e) => setState(e.target.value)}
            >
              <option value="">{copy.stateOther}</option>
              {CALCULATOR_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {rule && (
          <div className="nf-calc__rule" data-testid="calc-rule">
            <p className="nf-calc__rule-title">
              <UiIcon name="scale" size={16} aria-hidden />
              {copy.ruleTitle.replace("{state}", rule.stateName)}
            </p>
            <p className="nf-caption text-[var(--nf-content-secondary)]">
              {copy.ruleBody
                .replace("{agency}", bpsLabel(rule.agencyMaxBps))
                .replace("{legal}", bpsLabel(rule.legalMaxBps))
                .replace("{source}", rule.source)}
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setFee("agency", { mode: "percent", value: String(rule.agencyMaxBps / 100) });
                setFee("legal", { mode: "percent", value: String(rule.legalMaxBps / 100) });
              }}
            >
              {copy.ruleFill}
            </Button>
            <p className="nf-caption text-[var(--nf-content-muted)]">{copy.ruleNote}</p>
          </div>
        )}

        <fieldset className="nf-calc__fees">
          <legend className="nf-section-label">{copy.feesTitle}</legend>
          <p className="nf-caption text-[var(--nf-content-muted)]">{copy.feesHint}</p>
          {FEE_LINES.map((key) => {
            const fee = fees[key];
            const mode = fee?.mode ?? "amount";
            return (
              <div key={key} className="nf-calc__fee">
                <label htmlFor={`${id}-${key}`} className="nf-calc__fee-label">
                  {copy.lines[key]}
                </label>
                <div className="nf-calc__fee-input">
                  <input
                    id={`${id}-${key}`}
                    name={key}
                    className="nf-field nf-numeric"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0"
                    value={fee?.value ?? ""}
                    onChange={(e) => setFee(key, { value: e.target.value.slice(0, 18) })}
                    aria-invalid={invalid === key || undefined}
                    data-testid={`calc-${key}`}
                  />
                  <Segmented
                    semantics="radio"
                    size="sm"
                    label={`${copy.lines[key]}: ${copy.asAmount} / ${copy.asPercent}`}
                    value={mode}
                    onChange={(next) => setFee(key, { mode: next })}
                    options={[
                      { value: "amount", label: "₦" },
                      { value: "percent", label: "%" },
                    ]}
                  />
                </div>
                {invalid === key && <p className="nf-caption text-[var(--nf-state-error)]">{copy.invalid}</p>}
              </div>
            );
          })}
        </fieldset>
      </form>

      <section className="nf-pd-card nf-calc__result" aria-live="polite" aria-labelledby={`${id}-total`}>
        {/* The centred hero figure (spec section 17): caption, figure, then the bar. */}
        <p id={`${id}-total`} className="nf-section-label nf-calc__caption">
          {copy.totalLabel}
        </p>
        {result.state === "ok" ? (
          <>
            <p className="nf-calc__total nf-numeric" data-testid="calc-total">
              {money(result.totalMinor)}
            </p>
            <StatusBar
              label={copy.barLabel}
              legend={false}
              segments={result.lines.map((line) => ({
                key: line.key,
                label: lineLabel(line.key),
                count: line.minor,
                tone: LINE_TONES[line.key],
                display: money(line.minor),
              }))}
            />
            <ul className="nf-calc__lines">
              {result.lines.map((line) => (
                <li key={line.key}>
                  <span className="nf-calc__dot" data-tone={LINE_TONES[line.key]} aria-hidden="true" />
                  <span className="nf-calc__line-label">{lineLabel(line.key)}</span>
                  <span className="nf-calc__line-value nf-numeric">{money(line.minor)}</span>
                </li>
              ))}
            </ul>
            <p className="nf-caption text-[var(--nf-content-muted)]">{copy.totalNote}</p>
            <div className="nf-calc__actions">
              <Button type="button" variant="secondary" size="md" leadingIcon="share" onClick={share}>
                {copy.share}
              </Button>
              <Button type="button" variant="ghost" size="md" leadingIcon="link" onClick={copyLink}>
                {copied ? copy.copied : copy.copyLink}
              </Button>
            </div>
          </>
        ) : (
          <p className="nf-calc__empty" data-tone={result.state === "invalid" ? "error" : undefined}>
            {result.state === "invalid" ? copy.invalid : copy.emptyTotal}
          </p>
        )}
        <div className="nf-calc__cta">
          <ButtonLink href="/start" variant="primary" size="lg" full trailingIcon="arrow-right">
            {copy.cta}
          </ButtonLink>
          <p className="nf-caption text-[var(--nf-content-muted)]">{copy.ctaNote}</p>
        </div>
      </section>
    </div>
  );
}
