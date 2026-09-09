/**
 * Presentation helpers. Pure, so they are testable without rendering.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import {
  isStale,
  monthsSinceVerified,
  type ConditionableFact,
  type Obligation,
} from "@optima-compliance/engine";

/**
 * Money, from integer minor units.
 *
 * Integer arithmetic to the last step: dividing by 100 early reintroduces
 * exactly the float error the minor-units convention exists to prevent.
 */
export function formatMoney(minorUnits: number, currency = "USD"): string {
  const sign = minorUnits < 0 ? "-" : "";
  const abs = Math.abs(minorUnits);
  const major = Math.trunc(abs / 100).toLocaleString("en-US");
  const minor = String(abs % 100).padStart(2, "0");
  return `${sign}${currency === "USD" ? "$" : `${currency} `}${major}.${minor}`;
}

/**
 * The fee cell.
 *
 * An em dash, never "$0.00". Reporting zero claims the filing is free; what we
 * actually know is that nobody recorded a fee.
 */
export function formatFee(obligation: Obligation): string {
  return obligation.feeMinorUnits === undefined
    ? "—"
    : formatMoney(obligation.feeMinorUnits, obligation.currency);
}

/** `2026-03-31` → `31 Mar 2026`. Unambiguous across US and non-US readers. */
export function formatDate(date: string): string {
  const [year, month, day] = date.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${Number(day)} ${months[Number(month) - 1]} ${year}`;
}

/** Whole days from `from` to `to`. Negative when `to` is in the past. */
export function daysUntil(from: string, to: string): number {
  const parse = (d: string) => {
    const [y, m, day] = d.split("-").map(Number);
    return Date.UTC(y!, m! - 1, day!);
  };
  return Math.round((parse(to) - parse(from)) / 86_400_000);
}

export type Urgency = "overdue" | "due-soon" | "upcoming";

/**
 * How loudly to present a deadline.
 *
 * Thresholds are generous on purpose. Most filings take more than a few days to
 * prepare — gathering figures, getting a board signature — so "due soon" at 30
 * days is a useful prompt, while a 3-day warning is just an apology.
 */
export function urgency(asOf: string, dueOn: string): Urgency {
  const days = daysUntil(asOf, dueOn);
  if (days < 0) return "overdue";
  if (days <= 30) return "due-soon";
  return "upcoming";
}

/** Human phrasing for the countdown. */
export function relativeDue(asOf: string, dueOn: string): string {
  const days = daysUntil(asOf, dueOn);
  if (days === 0) return "due today";
  if (days === 1) return "due tomorrow";
  if (days < 0) {
    const overdue = Math.abs(days);
    return `${overdue} day${overdue === 1 ? "" : "s"} overdue`;
  }
  if (days < 45) return `in ${days} days`;
  const months = Math.round(days / 30);
  return `in about ${months} month${months === 1 ? "" : "s"}`;
}

/**
 * How the age of a rule's last verification should read, and whether it is old
 * enough to call out.
 *
 * Phrased about the *checking*, not about the rule — "Checked 3 months ago"
 * rather than "3 months old". A rule can be decades old and perfectly correct;
 * what the user is being told is how long since a human confirmed it, which is
 * the thing that decays.
 *
 * The stale wording is deliberately blunt. "Not checked in 18 months" states a
 * fact the reader can act on; a softer "may be out of date" is a hedge that
 * reads as boilerplate and gets skipped, which defeats the point of surfacing
 * it at all.
 *
 * `stale` drives colour, but the two strings already differ from each other, so
 * the distinction survives for a reader who cannot see the colour and for a
 * screen reader that gets nothing from it — WCAG 1.4.1, same as the urgency
 * treatment above.
 */
export function verificationNote(
  asOf: string,
  lastVerified: string,
): { text: string; stale: boolean } {
  const months = monthsSinceVerified(lastVerified, asOf);
  const stale = isStale(lastVerified, asOf);

  if (stale) {
    return { text: `Not checked in ${months} months`, stale: true };
  }
  if (months === 0) return { text: "Checked this month", stale: false };
  return {
    text: `Checked ${months} month${months === 1 ? "" : "s"} ago`,
    stale: false,
  };
}

/** Entity-type codes to something a person would say. */
const ENTITY_TYPE_LABELS: Record<string, string> = {
  "501c3": "501(c)(3)",
  "nonprofit-corp": "Nonprofit corporation",
  llc: "LLC",
  "s-corp": "S-Corp",
  "c-corp": "C-Corp",
  "b-corp": "B-Corp",
};

export function entityTypeLabel(type: string): string {
  return ENTITY_TYPE_LABELS[type] ?? type;
}

/** `US-WA` → `Washington`; `US` → `Federal`. */
const JURISDICTION_LABELS: Record<string, string> = {
  US: "Federal",
  "US-WA": "Washington",
  "US-OR": "Oregon",
  "US-DE": "Delaware",
};

export function jurisdictionLabel(jurisdiction: string): string {
  return JURISDICTION_LABELS[jurisdiction] ?? jurisdiction;
}

/**
 * What to call the facts a rule can turn on, in the customer's words.
 *
 * Labels only — the identifiers are the engine's, imported rather than copied.
 * Typed as `Record<ConditionableFact, string>` so the day the engine gains
 * another conditionable fact this fails to compile, instead of rendering
 * `isPrivateFoundation` at somebody reading their filing calendar.
 *
 * The wording answers the question the sentence around it asks, because a
 * field name is not a question: "we need to know whether you are a private
 * foundation" is something a reader can act on; the identifier is not.
 */
export const CONDITIONABLE_FACT_LABELS: Record<ConditionableFact, string> = {
  grossRevenueMinorUnits: "your gross revenue",
  totalAssetsMinorUnits: "your total assets",
  charitableAssetsMinorUnits: "the charitable assets you hold",
  employeeCount: "how many people you employ",
  solicitsCharitableContributions: "whether you ask the public for donations",
  isPrivateFoundation: "whether you are a private foundation",
  isSupportingOrganization: "whether you are a 509(a)(3) supporting organisation",
  // Worded to make the distinction from gross revenue audible, because the two
  // questions sound identical read quickly and a reader who answers this with
  // their total revenue loses the exemption it exists to grant.
  contributionsRaisedMinorUnits: "how much you raised in donations",
  allFundraisingUnpaid: "whether all your work, fundraising included, is done by unpaid volunteers",
  assetsOrIncomeInureToInsiders:
    "whether any of your money or property goes to an officer, director, member or trustee",
  incomeProducingCharitableAssetsMinorUnits:
    "how much of your charitable assets is invested to produce income",
  // Derived, so nobody can answer it directly — the evaluator reports the input
  // that would decide it instead, and this label exists so a rule that ever
  // does surface the derived name still reads as English.
  normalAnnualGrossReceiptsMinorUnits: "your gross revenue for the last three years",
};

/**
 * "your gross revenue and your total assets" — an English list, not a CSV.
 *
 * A rule needing two facts is the common case for the 990 family, and
 * `grossRevenueMinorUnits, totalAssetsMinorUnits` in a sentence reads as an
 * error message rather than as a question somebody could answer.
 */
export function describeMissingFacts(facts: readonly string[]): string {
  const labels = facts.map(
    (fact) => CONDITIONABLE_FACT_LABELS[fact as ConditionableFact] ?? fact,
  );
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}
