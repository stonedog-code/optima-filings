/**
 * @optima-compliance/reminders — notification windows over anything with a due date.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Pure and clock-free, like the engine: `asOf` is always a parameter. The same
 * windows drive the dashboard here and the email digests in the hosted service,
 * which is why this is a published package rather than a helper in the app —
 * code cannot cross the licence boundary, so a copy over there would drift.
 *
 * Deliberately knows nothing about rules. It buckets **dated items**, whoever
 * authored them: a deadline the engine derived and one the user typed are equal
 * inputs here, because a user who does not trust the rule packs still needs
 * their own dates to arrive on time.
 */

import { addDays, addMonths, compareDates, isOnOrAfter, isOnOrBefore } from "@optima-compliance/engine";
import type { CalendarDate } from "@optima-compliance/engine";

/** Where a dated item came from. Never collapse these — see `DatedItem`. */
export type ItemSource = "rule" | "user";

/**
 * Anything that can appear on the calendar.
 *
 * `source` is required rather than optional because the distinction is the
 * whole point: an obligation the engine derived from a cited statute and a
 * reminder someone typed are different kinds of claim, and a UI that renders
 * them identically is quietly overstating one of them.
 */
export interface DatedItem {
  id: string;
  title: string;
  dueOn: CalendarDate;
  source: ItemSource;
  /** Present on rule-derived items; absent on user-authored ones. */
  citation?: string;
  /** Deep link to the statute or regulation the citation names. */
  citationUrl?: string;
  /**
   * The agency's own page for this filing — where to go and check what is true
   * today.
   *
   * Carried all the way through to the UI rather than stopping at the engine,
   * because the projection here is where it would otherwise be lost. `citation`
   * made that trip alone for a long time and `citationUrl` did not, so the
   * source rendered as unclickable text in the shipped app while a component
   * that DID link it sat unused three files away.
   */
  agencyUrl?: string;
  /**
   * The rule this came from — `us-wa-sos-nonprofit-annual-report`.
   *
   * A stable, permanent public identifier. It is what makes a report about this
   * row actionable: "the Washington fee is wrong" leaves somebody to work out
   * which of several Washington rules is meant, and a rule id does not.
   *
   * Rule-derived items only — a user-authored action came from no rule.
   */
  ruleId?: string;
  /** `US-WA`, `US-WA/seattle`, `US`. Rule-derived items only. */
  jurisdiction?: string;
  /**
   * What the filing costs, already in words — `"$60.00"`, `"$20.00 – $60.00"`,
   * `"at least $175.00"`. Rule-derived items only.
   *
   * Formatted rather than numeric because the engine now has three fee states
   * and only one of them is a single number; a `feeMinorUnits` here could not
   * carry a range without either lying about it or growing three more fields.
   * `feeAmountText` in the engine is the one place that branch is written.
   *
   * **Absent means nobody established the cost** — never that the filing is
   * free. A consumer must not render it as `$0.00`.
   */
  fee?: string;
  /**
   * Why the fee is a range, in a sentence written for the filer. Only ever
   * present alongside a `fee` that is a range.
   *
   * A range with no reason is barely better than the wrong flat number it
   * replaced (NEH-403), so a consumer showing `fee` should show this too.
   */
  feeReason?: string;
  /** `draft` on an unverified rule. Absent for user items — they are neither. */
  status?: "draft" | "active";
  /** User items only. Completing a rule obligation is not modelled yet. */
  completedOn?: CalendarDate;
  entityId?: string;
  documentId?: string;
  detail?: string;
  /** User items only. Completing it creates next year's occurrence. */
  repeatAnnually?: boolean;
}

/**
 * The digest cadences.
 *
 * Each names the horizon it reports on, matching what a person would expect
 * from a message with that subject line: a **weekly** digest is about the next
 * seven days, not about the last seven.
 */
export const WINDOWS = ["day-before", "weekly", "monthly", "quarterly"] as const;
export type WindowName = (typeof WINDOWS)[number];

export interface WindowDefinition {
  name: WindowName;
  /** What the digest is called where a person will read it. */
  label: string;
  /** The sentence a digest leads with. */
  heading: string;
}

export const WINDOW_DEFINITIONS: Record<WindowName, WindowDefinition> = {
  "day-before": {
    name: "day-before",
    label: "Tomorrow",
    heading: "Due tomorrow",
  },
  weekly: {
    name: "weekly",
    label: "This week",
    heading: "Required in the next 7 days",
  },
  monthly: {
    name: "monthly",
    label: "This month",
    heading: "Required in the next 30 days",
  },
  quarterly: {
    name: "quarterly",
    label: "Next 3 months",
    heading: "Required in the next 3 months",
  },
};

/** The last date each window covers, given a starting point. */
export function windowEnd(asOf: CalendarDate, window: WindowName): CalendarDate {
  switch (window) {
    case "day-before":
      return addDays(asOf, 1);
    case "weekly":
      return addDays(asOf, 7);
    case "monthly":
      return addDays(asOf, 30);
    case "quarterly":
      return addMonths(asOf, 3);
  }
}

export interface Bucketed {
  /**
   * Past due and not completed.
   *
   * Reported separately and first, because an overdue filing is the one thing
   * a compliance tool exists to prevent — folding it into "this week" would
   * bury the only item where action is already late.
   */
  overdue: DatedItem[];
  /** Items whose due date falls inside each window, soonest first. */
  windows: Record<WindowName, DatedItem[]>;
  /** Due beyond the furthest window. Not in any digest, but visible on screen. */
  later: DatedItem[];
  /** Completed user actions, kept out of every other bucket. */
  completed: DatedItem[];
}

/**
 * Bucket items by how soon they are due.
 *
 * **Windows nest rather than partition.** Something due tomorrow appears in
 * `day-before`, `weekly`, `monthly` and `quarterly` alike, because each digest
 * is a standalone message answering "what is coming in this period" — a
 * monthly digest that omitted next week's deadlines because a weekly digest
 * already mentioned them would be actively misleading.
 *
 * Callers that need a flat list (a dashboard grouping items exactly once) use
 * `narrowestWindow` instead.
 */
export function bucket(items: readonly DatedItem[], asOf: CalendarDate): Bucketed {
  const byDate = [...items].sort(
    (a, b) => compareDates(a.dueOn, b.dueOn) || a.title.localeCompare(b.title),
  );

  const completed = byDate.filter((item) => item.completedOn !== undefined);
  const open = byDate.filter((item) => item.completedOn === undefined);

  const overdue = open.filter((item) => !isOnOrAfter(item.dueOn, asOf));
  const upcoming = open.filter((item) => isOnOrAfter(item.dueOn, asOf));

  const windows = Object.fromEntries(
    WINDOWS.map((name) => [
      name,
      upcoming.filter((item) => isOnOrBefore(item.dueOn, windowEnd(asOf, name))),
    ]),
  ) as Record<WindowName, DatedItem[]>;

  const quarterEnd = windowEnd(asOf, "quarterly");
  const later = upcoming.filter((item) => !isOnOrBefore(item.dueOn, quarterEnd));

  return { overdue, windows, later, completed };
}

/**
 * The tightest window an item falls into, or `undefined` if it is beyond all of
 * them. Used where each item must appear exactly once.
 */
export function narrowestWindow(
  item: DatedItem,
  asOf: CalendarDate,
): WindowName | undefined {
  if (!isOnOrAfter(item.dueOn, asOf)) return undefined;
  return WINDOWS.find((name) => isOnOrBefore(item.dueOn, windowEnd(asOf, name)));
}

/**
 * Whether a digest for this cadence has anything worth sending.
 *
 * Overdue items count, so a digest still goes out when nothing new is due but
 * something is already late. **An empty digest should not be sent** — a
 * recurring message that is usually empty trains people to ignore it, and then
 * the one that matters is ignored too.
 */
export function hasContent(bucketed: Bucketed, window: WindowName): boolean {
  return bucketed.overdue.length > 0 || bucketed.windows[window].length > 0;
}
