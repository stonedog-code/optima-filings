/**
 * The evaluator.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import {
  addDays,
  addMonths,
  compareDates,
  dateInMonth,
  isOnOrAfter,
  isOnOrBefore,
  parseDate,
  parseMonthDay,
} from "./calendar.js";
import {
  rollForwardToBusinessDay,
  rollBackwardToBusinessDay,
  type HolidayCalendar,
} from "./holidays.js";
import type { CalendarDate, EntityFacts } from "./facts.js";
import { isConditionGroup } from "./rule.js";
import type {
  Cadence,
  Rule,
  RuleCondition,
  RuleConditionGroup,
  RuleStatus,
} from "./rule.js";

/**
 * Where a reported rule came from — everything a consumer needs to show it and
 * to let a reader check it against the source.
 *
 * **Shared by `Obligation` and `IndeterminateRule` on purpose (NEH-518).** They
 * carried this independently and drifted: the obligation grew `agency`,
 * `citation`, `citationUrl`, `agencyUrl`, `status` and `lastVerified`, and the
 * indeterminate rule got none of them. That asymmetry is invisible until a
 * consumer renders indeterminate rules as first-class rows — and then it is the
 * *majority* of rows that cannot link their statute, because an entity that has
 * not supplied its financials has far more undecidable rules than decided ones.
 *
 * A shared base rather than two matching field lists, so the next field added
 * reaches both. The alternative had already failed once, quietly.
 */
export interface RuleProvenance {
  ruleId: string;
  title: string;
  agency: string;
  jurisdiction: string;
  feeMinorUnits?: number;
  currency?: "USD";
  form?: string;
  citation: string;
  citationUrl?: string;
  /**
   * The agency's own page for this filing — where a filer goes to file it and
   * read the current fee, form and deadline.
   *
   * Separate from `citationUrl` because the statute frequently does not carry
   * the operative detail: RCW 23.95.255(4) hands the due date to the secretary
   * of state, and 8 Del. C. 502 sets no fee. A consumer showing only the
   * citation sends someone to a page that cannot answer the question they came
   * with.
   */
  agencyUrl?: string;
  /**
   * Carried through from the rule so a consumer can label it. The engine
   * reports; it does not decide how an unverified rule should be presented.
   */
  status: RuleStatus;
  lastVerified: CalendarDate;
}

/** One thing the entity owes, on one date. */
export interface Obligation extends RuleProvenance {
  dueOn: CalendarDate;

  /**
   * Which holiday calendar was applied when computing `dueOn` — NEH-443.
   *
   * `undefined` means **none was**, and that is the point of the field rather
   * than an omission. "We did not check for holidays in this jurisdiction" and
   * "we checked and this date is clear" are different claims, and a compliance
   * product that reports them identically is making the stronger one for free.
   *
   * Federal rules can say `"us-federal"`. State rules cannot say anything yet,
   * because state holidays are not modelled — so a state deadline landing on a
   * state holiday is still wrong, and this field is how a consumer can SEE that
   * rather than infer it. A UI is expected to render the difference.
   *
   * It reports the calendar the rule asked for, not whether a shift happened.
   * "Considered and no move was needed" and "considered and moved" are both
   * checked; only the third case is the one worth surfacing.
   */
  holidayCalendar?: HolidayCalendar;
}

/**
 * A rule that might apply but cannot be decided, because the entity has not
 * supplied a fact the rule tests.
 *
 * Reported rather than silently dropped. "You may owe a Form 990 — tell us your
 * gross revenue" is useful; an incomplete calendar presented as complete is
 * exactly the failure this product cannot afford.
 *
 * It carries the same provenance as an obligation, so a consumer can name the
 * agency and link the statute for a rule it cannot yet date. A row that says
 * "this may apply to you" with nothing to check is the weakest form of the
 * promise this project makes.
 */
export interface IndeterminateRule extends RuleProvenance {
  /** Facts the entity would need to supply to decide it. */
  missingFacts: string[];
}

/**
 * Project a rule onto its provenance.
 *
 * The single place these fields are copied, which is what makes the shared base
 * a guarantee rather than a convention — two independent copies is exactly how
 * they drifted apart in the first place.
 */
function provenanceOf(rule: Rule): RuleProvenance {
  return {
    ruleId: rule.id,
    title: rule.title,
    agency: rule.agency,
    jurisdiction: rule.jurisdiction,
    ...(rule.fee
      ? {
          feeMinorUnits: rule.fee.amountMinorUnits,
          currency: rule.fee.currency,
        }
      : {}),
    ...(rule.form ? { form: rule.form } : {}),
    citation: rule.citation,
    ...(rule.citationUrl ? { citationUrl: rule.citationUrl } : {}),
    ...(rule.agencyUrl ? { agencyUrl: rule.agencyUrl } : {}),
    status: rule.status,
    lastVerified: rule.lastVerified,
  };
}

export interface EvaluateOptions {
  /**
   * The date to evaluate as of. **Required, with no default.** The engine never
   * reads the clock: a default here would make every result depend on when it
   * ran, which breaks caching, reproducibility, and any question about the past.
   */
  asOf: CalendarDate;
  /** How far ahead to project recurring obligations. Default 12. */
  horizonMonths?: number;
  /** Include rules still marked `draft`. Default false. */
  includeDraft?: boolean;
}

export interface EvaluationResult {
  obligations: Obligation[];
  indeterminate: IndeterminateRule[];
}

/**
 * What does this entity owe between `asOf` and the horizon?
 *
 * Pure and total: same inputs, same output, forever. No I/O, no clock, no
 * environment. That is what makes it testable against thousands of fixtures,
 * safe to run in a browser, and safe to expose as the B2B API.
 */
export function evaluate(
  entity: EntityFacts,
  rules: readonly Rule[],
  options: EvaluateOptions,
): EvaluationResult {
  const { asOf, horizonMonths = 12, includeDraft = false } = options;
  const horizonEnd = addMonths(asOf, horizonMonths);

  const obligations: Obligation[] = [];
  const indeterminate: IndeterminateRule[] = [];

  for (const rule of rules) {
    if (rule.status === "draft" && !includeDraft) continue;
    if (!appliesToJurisdiction(entity, rule)) continue;
    if (!appliesToEntityType(entity, rule)) continue;

    const conditions = resolveConditions(entity, rule);
    if (conditions.truth === "false") continue;
    if (conditions.truth === "unknown") {
      indeterminate.push({
        ...provenanceOf(rule),
        missingFacts: conditions.missing,
      });
      continue;
    }

    for (const dueOn of dueDatesInWindow(entity, rule, asOf, horizonEnd)) {
      // The rule's own effective window is checked against the DUE date, not
      // against `asOf`. A rule that expires in June still governs a filing that
      // was due in March, which is what makes historical questions answerable.
      if (!ruleInForceOn(rule, dueOn)) continue;

      // `holidayCalendar` is copied from the rule rather than derived from
      // whether a shift happened: the field reports what was CONSIDERED, and a
      // date that needed no move was still checked (NEH-443).
      obligations.push({
        ...provenanceOf(rule),
        dueOn,
        ...(rule.holidayCalendar ? { holidayCalendar: rule.holidayCalendar } : {}),
      });
    }
  }

  obligations.sort(
    (a, b) => compareDates(a.dueOn, b.dueOn) || a.ruleId.localeCompare(b.ruleId),
  );
  indeterminate.sort((a, b) => a.ruleId.localeCompare(b.ruleId));

  return { obligations, indeterminate };
}

// ---------------------------------------------------------------------------
// Applicability
// ---------------------------------------------------------------------------

function appliesToJurisdiction(entity: EntityFacts, rule: Rule): boolean {
  return entity.jurisdictions.includes(rule.jurisdiction);
}

function appliesToEntityType(entity: EntityFacts, rule: Rule): boolean {
  // An entity holds several legal forms at once — a 501(c)(3) is also a
  // nonprofit corporation — and a rule applies if ANY of them matches. Testing
  // a single "primary" type would drop either the state report or the federal
  // return depending on which one was called primary.
  return rule.entityTypes.some((type) => entity.entityTypes.includes(type));
}

function ruleInForceOn(rule: Rule, date: CalendarDate): boolean {
  if (!isOnOrAfter(date, rule.effectiveFrom)) return false;
  if (rule.effectiveTo && !isOnOrBefore(date, rule.effectiveTo)) return false;
  return true;
}

function factValue(
  entity: EntityFacts,
  fact: RuleCondition["fact"],
): number | boolean | undefined {
  return entity[fact];
}

/**
 * Three-valued, because "we do not know" is a distinct and useful answer.
 *
 * Collapsing `unknown` into `false` is the tempting simplification and it is
 * wrong: it silently turns "you have not told us your revenue" into "you do not
 * owe a Form 990".
 */
type Truth = "true" | "false" | "unknown";

function testCondition(entity: EntityFacts, condition: RuleCondition): Truth {
  const actual = factValue(entity, condition.fact);
  if (actual === undefined) return "unknown";
  switch (condition.op) {
    case "eq":
      return actual === condition.value ? "true" : "false";
    case "lt":
      return actual < condition.value ? "true" : "false";
    case "lte":
      return actual <= condition.value ? "true" : "false";
    case "gt":
      return actual > condition.value ? "true" : "false";
    case "gte":
      return actual >= condition.value ? "true" : "false";
  }
}

/**
 * A group holds if any member does — and a **known true beats an unknown**.
 *
 * That precedence is the point of doing this properly. An organisation with
 * $3M of receipts owes Form 990 whether or not it has told us its total assets,
 * so asking for assets it does not need to supply would be noise. Only when
 * nothing is known-true does an unknown member make the group undecidable.
 */
function testGroup(
  entity: EntityFacts,
  group: RuleConditionGroup,
): { truth: Truth; missing: string[] } {
  const results = group.anyOf.map((condition) => ({
    truth: testCondition(entity, condition),
    fact: condition.fact,
  }));

  if (results.some((r) => r.truth === "true")) {
    return { truth: "true", missing: [] };
  }
  const unknown = results.filter((r) => r.truth === "unknown");
  if (unknown.length > 0) {
    return { truth: "unknown", missing: unknown.map((r) => r.fact) };
  }
  return { truth: "false", missing: [] };
}

/**
 * Resolve a rule's whole condition set against an entity.
 *
 * The top level is an AND, and **a known-false entry short-circuits everything
 * else** — including unknowns. If a rule requires the entity to solicit
 * contributions and it demonstrably does not, the rule does not apply, and
 * demanding its revenue first would be asking for data to settle a question
 * already settled.
 */
function resolveConditions(
  entity: EntityFacts,
  rule: Rule,
): { truth: Truth; missing: string[] } {
  const missing: string[] = [];
  let sawUnknown = false;

  for (const node of rule.conditions ?? []) {
    const result = isConditionGroup(node)
      ? testGroup(entity, node)
      : { truth: testCondition(entity, node), missing: [node.fact] };

    if (result.truth === "false") return { truth: "false", missing: [] };
    if (result.truth === "unknown") {
      sawUnknown = true;
      missing.push(...result.missing);
    }
  }

  return sawUnknown
    ? { truth: "unknown", missing: [...new Set(missing)] }
    : { truth: "true", missing: [] };
}

// ---------------------------------------------------------------------------
// Due dates
// ---------------------------------------------------------------------------

/**
 * Every due date this rule produces between `from` and `to`, inclusive.
 *
 * Walks forward from the rule's first occurrence rather than computing "the
 * next one" from `asOf`. Slower, and correct for biennial cadences: an
 * entity formed in an odd year files in odd years, and a from-now calculation
 * loses that parity.
 */
function dueDatesInWindow(
  entity: EntityFacts,
  rule: Rule,
  from: CalendarDate,
  to: CalendarDate,
): CalendarDate[] {
  const dates: CalendarDate[] = [];
  const step = rule.cadence.type === "biennial" ? 2 : 1;

  if (rule.cadence.type === "one-time") {
    const due = applyWeekendRule(
      rule,
      addDays(entity.formedOn, rule.cadence.offsetDays),
    );
    return isOnOrAfter(due, from) && isOnOrBefore(due, to) ? [due] : [];
  }

  const firstYear = parseDate(entity.formedOn).year;
  const lastYear = parseDate(to).year;

  for (let year = firstYear; year <= lastYear; year += step) {
    const raw = occurrenceInYear(entity, rule.cadence, year);
    if (raw === undefined) continue;
    // An obligation cannot predate the entity. A calendar-anchored rule would
    // otherwise emit a due date in the formation year that fell before the
    // entity existed.
    if (!isOnOrAfter(raw, entity.formedOn)) continue;

    const due = applyWeekendRule(rule, raw);
    if (isOnOrAfter(due, from) && isOnOrBefore(due, to)) dates.push(due);
  }

  return dates;
}

function occurrenceInYear(
  entity: EntityFacts,
  cadence: Cadence,
  year: number,
): CalendarDate | undefined {
  switch (cadence.anchor) {
    case "formation-month": {
      const { month } = parseDate(entity.formedOn);
      return dateInMonth(year, month, cadence.dayOfMonth);
    }
    case "formation-anniversary": {
      // Month AND day from the entity — the difference from `formation-month`,
      // which takes the day from the rule.
      //
      // `dateInMonth` clamps, so a 29 February formation gives 28 February in a
      // common year. That is not a convenient accident: ORS 65.001 defines the
      // anniversary as 28 February in exactly that case, so the clamp and the
      // statute agree and no special case is needed.
      const { month, day } = parseDate(entity.formedOn);
      return dateInMonth(year, month, day);
    }
    case "calendar": {
      return dateInMonth(year, cadence.month, cadence.day);
    }
    case "fiscal-year-end": {
      // The year end that FALLS in this year, then offset forward. For a
      // calendar-year filer with a 5-month offset that is 31 Dec -> 31 May of
      // the following year, which is why the due date can land outside `year`.
      const { month, day } = parseMonthDay(entity.fiscalYearEnd);
      const yearEnd = dateInMonth(year, month, day);
      const shifted = addMonths(yearEnd, cadence.offsetMonths);
      const { year: dueYear, month: dueMonth } = parseDate(shifted);
      return dateInMonth(dueYear, dueMonth, cadence.dayOfMonth);
    }
    case "formation":
      return undefined;
  }
}

function applyWeekendRule(rule: Rule, date: CalendarDate): CalendarDate {
  // An explicit switch rather than a ternary chain, and no `default` that
  // silently returns the date. A rule carrying a direction this engine does not
  // know is the `formation-anniversary` failure again — an unknown value
  // falling through a switch produced no obligations at all, silently, and a
  // clean calendar with filings missing from it is worse than a wrong date.
  // Here the type makes an unknown value unreachable; the exhaustive `never`
  // is what keeps that true when a third direction is added.
  switch (rule.weekendRule) {
    case "roll-forward":
      return rollForwardToBusinessDay(date, rule.holidayCalendar);
    case "roll-backward":
      return rollBackwardToBusinessDay(date, rule.holidayCalendar);
    case undefined:
      // Not "no opinion" — a deliberate statement that this rule's agency has
      // not said a weekend deadline moves, so we do not move it on their behalf.
      return date;
    default: {
      // The exhaustiveness check the comment above promised, and TypeScript
      // caught its absence: without it the switch has no ending return and a
      // future third direction would fall through returning `undefined`.
      //
      // `never` rather than a thrown error at runtime, because the failure to
      // prevent is a rule pack carrying a direction this engine version does
      // not know — and that must be a COMPILE error here, not a silent
      // un-rolled date in production. Returning the date unchanged would be the
      // `formation-anniversary` failure again: an unknown value handled
      // quietly, producing a wrong deadline that looks like a considered one.
      const unknown: never = rule.weekendRule;
      throw new Error(`Unknown weekendRule: ${String(unknown)}`);
    }
  }
}
