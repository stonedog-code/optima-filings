/**
 * The rule type. Mirrors `packages/rules/schema/rule.v1.json`.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * The JSON Schema is the contract for *data*; this is the contract for *code*.
 * They are kept in step by a test that validates every fixture against both, so
 * a field added to one and forgotten in the other fails rather than drifting.
 */

import type {
  CalendarDate,
  ConditionableFact,
  EntityType,
  Jurisdiction,
} from "./facts.js";

/**
 * How often the obligation recurs and what its due date is anchored to.
 *
 * These anchors cover every rule in the seed set, and each exists because a
 * real filing uses it — they are not a generic date DSL. Resist adding another
 * until a rule needs it: an anchor nothing uses is an untested branch that will
 * be wrong the first time someone reaches for it.
 */
export type Cadence =
  /**
   * Due somewhere in the anniversary month of formation, on a day the RULE
   * names. Washington: "the last day of your formation month", the same day for
   * every entity in the state.
   *
   * **Not the same as `formation-anniversary`**, and confusing the two is a
   * silent up-to-30-day error — see that anchor's note.
   */
  | {
      type: "annual" | "biennial";
      anchor: "formation-month";
      /** Day within that month; `"last"` is the common case. */
      dayOfMonth: number | "last";
    }
  /**
   * Due on the anniversary of formation — the month AND day come from the
   * ENTITY, so every entity in the state has a different due date. Oregon:
   * ORS 65.787(1), 60.787(1) and 63.787(1) all say "by the corporation's
   * anniversary".
   *
   * There is deliberately no `dayOfMonth` here. That is the whole distinction
   * from `formation-month`: a rule cannot name the day, because the day is a
   * fact about the entity.
   *
   * **Why this is its own anchor rather than a flag.** The two agree exactly
   * when an entity was formed on a month end, which is common enough that the
   * Oregon rules shipped wrong and a full fixture suite agreed with them — the
   * one Oregon fixture happened to be formed on the 31st (NEH-400). A separate
   * anchor makes the choice explicit at authoring time instead of a default
   * nobody revisits.
   *
   * Leap days need no special case: 29 February clamps to the 28th in a common
   * year, which is what ORS 65.001 says the anniversary is.
   */
  | {
      type: "annual" | "biennial";
      anchor: "formation-anniversary";
    }
  /** Due on a fixed calendar date every year. Delaware franchise tax. */
  | {
      type: "annual" | "biennial";
      anchor: "calendar";
      month: number;
      day: number;
    }
  /**
   * Due a number of months after the fiscal year ends. The federal returns:
   * Form 990 is due the 15th day of the 5th month after year end, which is
   * 15 May for a calendar-year filer and a different date for everyone else.
   */
  | {
      type: "annual";
      anchor: "fiscal-year-end";
      offsetMonths: number;
      dayOfMonth: number | "last";
    }
  /** Due once, a fixed number of days after formation. Initial reports. */
  | {
      type: "one-time";
      anchor: "formation";
      offsetDays: number;
    };

export interface Fee {
  /** **Integer minor units.** `6000` is $60.00. Never a float — see CLAUDE.md. */
  amountMinorUnits: number;
  currency: "USD";
}

export type ConditionOperator = "lt" | "lte" | "gt" | "gte" | "eq";

/**
 * A predicate over one entity fact.
 *
 * When a condition tests a fact the entity has not supplied, the rule is
 * neither applied nor dropped — it is reported as indeterminate, so the user is
 * told what they need to answer rather than quietly given an incomplete
 * calendar.
 */
export interface RuleCondition {
  fact: ConditionableFact;
  op: ConditionOperator;
  value: number | boolean;
}

/**
 * A group that holds when **any** member holds.
 *
 * Real thresholds are not all conjunctions. Form 990 is required when gross
 * receipts are at least $200,000 **or** total assets are at least $500,000, and
 * with only AND available the rule could express one half — which told a
 * well-endowed organisation with modest receipts that it owed nothing. A false
 * negative is this product's worst failure mode: the user sees a clean calendar
 * and misses a filing.
 *
 * Deliberately **one level deep**, not a general expression tree. Every real
 * rule seen so far is a conjunction of simple tests plus at most one
 * disjunction, and a nested boolean grammar would be markedly harder for a CPA
 * to author by hand or for a reviewer to check against a statute — which is the
 * whole crowdsourcing thesis. Add nesting when a statute demands it, not before.
 */
export interface RuleConditionGroup {
  anyOf: readonly RuleCondition[];
}

/**
 * One entry in a rule's `conditions`.
 *
 * The top level is always an AND — every entry must hold. An entry is either a
 * single test or an `anyOf` group.
 */
export type RuleConditionNode = RuleCondition | RuleConditionGroup;

export function isConditionGroup(
  node: RuleConditionNode,
): node is RuleConditionGroup {
  return "anyOf" in node;
}

/**
 * Whether a rule has been checked against its primary source by a human.
 *
 * `draft` is not a lesser form of `active` to be tidied up later — it is the
 * honest state for a rule written from general knowledge, and it exists so that
 * contributing a rule you are unsure about is possible without asserting
 * something false. Promotion to `active` means a person read the statute.
 */
export type RuleStatus = "draft" | "active";

export interface Rule {
  /** Stable, kebab-case, jurisdiction-prefixed. A permanent public identifier. */
  id: string;
  jurisdiction: Jurisdiction;
  /** What the filer sees. "Annual Report", not "us-wa-sos-annual-report". */
  title: string;
  /** The body it is filed with. "Washington Secretary of State". */
  agency: string;
  entityTypes: readonly EntityType[];
  cadence: Cadence;
  fee?: Fee;
  /** All entries must hold. An entry may be an `anyOf` group. */
  conditions?: readonly RuleConditionNode[];
  /** Form number or name, where the agency uses one. */
  form?: string;
  /** The statute, regulation, or agency page this came from. Required. */
  citation: string;
  citationUrl?: string;
  /**
   * The agency's OWN page for this filing — where a filer goes to file it and
   * to read the current fee, form and deadline.
   *
   * **Distinct from `citationUrl`, and both are needed.** A citation is the
   * legal source a reviewer checks the rule against; this is where a person
   * with a deadline actually goes. They are usually different pages, and often
   * different institutions.
   *
   * The reason it is a separate field rather than a nicety: **the statute
   * frequently does not carry the operative detail.** RCW 23.95.255(4) hands
   * the annual-report due date to the secretary of state and names no date;
   * 8 Del. C. 502 sets the 1 March deadline and no fee at all. Linking only the
   * statute would send someone to a page that cannot answer "what do I owe and
   * when", which is the only question they came with.
   */
  agencyUrl?: string;
  /** Date a human last confirmed this against the primary source. */
  lastVerified: CalendarDate;
  status: RuleStatus;
  effectiveFrom: CalendarDate;
  /** Absent means still in force. */
  effectiveTo?: CalendarDate;
  /** The rule that replaced this one, for a superseded rule. */
  supersededBy?: string;
  /**
   * Opt-in weekend rolling, and the DIRECTION is part of the opt-in.
   *
   * `roll-forward` — the deadline moves to the next business day. The IRS says
   * this explicitly for the 990 family.
   *
   * `roll-backward` — the deadline moves to the previous business day. This is
   * what an agency means when it asks for the last business day *of a period*
   * rather than the next business day *after a date*: WAC 434-120-140(2)(a)
   * wants Washington's charities renewal "no later than the last business day
   * of the eleventh month".
   *
   * Neither is a default and there is no third option meaning "guess". See
   * `rollOffWeekend` for why.
   */
  weekendRule?: "roll-forward" | "roll-backward";
  notes?: string;
}
