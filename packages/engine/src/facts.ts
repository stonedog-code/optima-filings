/**
 * The entity fact model.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * **A rule may only reference a fact that appears here.** That constraint is
 * enforced by `rules:validate`, and it is why this file was written before the
 * rule schema rather than alongside it: design rules first and you discover
 * each missing fact one rule at a time, versioning the schema repeatedly. Every
 * schema version is a migration for self-hosters and a breaking change for the
 * B2B API.
 *
 * Adding a fact is cheap and backwards-compatible. Changing what an existing
 * one *means* is neither — a rule written against the old meaning keeps
 * validating and starts producing wrong dates, with nothing failing anywhere.
 */

/**
 * A civil calendar date, `YYYY-MM-DD`.
 *
 * Deliberately a string, never a `Date`. A filing deadline is a civil date in
 * the filing jurisdiction, not an instant: "due March 31" is the same date for
 * a user in Seattle and one in Berlin, and the moment it becomes a `Date` it
 * acquires a timezone that will eventually shift it by a day.
 */
export type CalendarDate = string;

/** A month and day with no year, `MM-DD`. Used for fiscal year ends. */
export type MonthDay = string;

/**
 * A filing jurisdiction.
 *
 * `US` for federal, ISO 3166-2 for states (`US-WA`), and `US-WA/seattle` for a
 * municipality. Lowercase the municipality; the state part stays uppercase.
 */
export type Jurisdiction = string;

/**
 * Legal forms the rule packs distinguish between.
 *
 * `501c3` is a *tax* status layered on a state entity, not a state form — a
 * 501(c)(3) is almost always also a `nonprofit-corp`. Both are listed on an
 * entity that has both, because state and federal rules key off different ones:
 * Washington's annual report applies to the nonprofit corporation, and Form 990
 * applies to the exempt organisation.
 */
export const ENTITY_TYPES = [
  "501c3",
  "nonprofit-corp",
  "llc",
  "s-corp",
  "c-corp",
  "b-corp",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

/**
 * Everything the engine knows about an entity.
 *
 * Optional fields are genuinely unknown rather than zero. A rule that needs one
 * and does not get it is reported as **indeterminate** rather than silently
 * skipped — see `evaluate`. Treating "revenue unknown" as "revenue is 0" is how
 * a system tells a large charity it can file the postcard return.
 */
export interface EntityFacts {
  /** Display name. Never used in evaluation; carried for output only. */
  name: string;

  /** Every legal form this entity holds. See `ENTITY_TYPES`. */
  entityTypes: EntityType[];

  /** Date of formation in the home jurisdiction. Anchors anniversary cadences. */
  formedOn: CalendarDate;

  /** The state the entity was formed in. */
  homeJurisdiction: Jurisdiction;

  /**
   * Every jurisdiction the entity is registered in, including `US` and the
   * home state. A rule only applies if its jurisdiction is in this list —
   * registering in a state is what creates the obligation to it.
   */
  jurisdictions: Jurisdiction[];

  /**
   * Fiscal year end as `MM-DD`. Defaults to `12-31` at the call site, never
   * here — a silent default in the model hides the difference between "calendar
   * year" and "nobody told us", and the federal return's due date depends on it.
   */
  fiscalYearEnd: MonthDay;

  /**
   * When the entity registered in each foreign jurisdiction, for rules anchored
   * to the registration anniversary rather than to formation. Keyed by
   * jurisdiction.
   */
  registeredOn?: Record<Jurisdiction, CalendarDate>;

  /** Gross annual revenue in **integer minor units** (cents). */
  grossRevenueMinorUnits?: number;

  /**
   * Gross receipts for the taxable year **immediately before** the one
   * `grossRevenueMinorUnits` describes, in integer minor units.
   *
   * Optional, and optional in the strong sense: leaving it out is a normal
   * answer, not a gap to be nagged about. It exists because several federal
   * thresholds are not tests on one year's figure at all.
   *
   * **Form 990-N eligibility is a "normally" test, and "normally" means an
   * average.** Rev. Proc. 2011-15, section 4(3): an organisation in existence
   * three years or more has annual gross receipts normally not more than
   * $50,000 if "the organization's average annual gross receipts for the
   * immediately preceding three taxable years, including the taxable year for
   * which the return is filed, is $50,000 or less". Evaluating the current year
   * alone gets that wrong in BOTH directions — a one-off bequest year pushes a
   * genuinely small organisation onto Form 990-EZ, and a lean year after two
   * large ones qualifies an organisation for a return it may not file.
   *
   * See `normalAnnualGrossReceiptsMinorUnits` for how the three are combined,
   * and what the engine does when only some of them are supplied.
   */
  grossRevenuePriorYear1MinorUnits?: number;

  /**
   * Gross receipts for the taxable year **two years before** the one
   * `grossRevenueMinorUnits` describes, in integer minor units.
   *
   * The third of the three years Rev. Proc. 2011-15 section 4(3) averages.
   */
  grossRevenuePriorYear2MinorUnits?: number;

  /** Total assets in **integer minor units** (cents). */
  totalAssetsMinorUnits?: number;

  /**
   * Assets held for charitable purposes, in **integer minor units**.
   *
   * **Deliberately not the same as `totalAssetsMinorUnits`.** Several state
   * charity-registration thresholds are written against charitable assets
   * specifically, and an organisation can hold substantial non-charitable
   * assets — an endowment restricted to a non-charitable purpose, a trading
   * subsidiary — that do not count toward them. Reusing total assets would
   * over-trigger registration for exactly those organisations, and telling
   * someone to register when they need not is a real cost in fees and filings.
   */
  charitableAssetsMinorUnits?: number;

  /** Headcount, for rules with an employee threshold. */
  employeeCount?: number;

  /**
   * Whether the entity solicits charitable contributions. Drives state charity
   * registration, which is a separate obligation from the corporate annual
   * report and is the one people most often miss.
   */
  solicitsCharitableContributions?: boolean;

  /**
   * Whether this 501(c)(3) is a **private foundation** rather than a public
   * charity.
   *
   * A fact rather than an entity type, deliberately. `ENTITY_TYPES` values are
   * permanent public identifiers persisted in every self-hoster's database and
   * carried across the tier boundary, so adding one is a decision that cannot
   * be taken back. Whether an organisation is a foundation is something we ask
   * it — and a wrong answer is corrected by editing a field, not by migrating a
   * vocabulary.
   *
   * **It has no default, and that is the whole point.** A private foundation is
   * a 501(c)(3), so before this fact existed one with modest receipts matched
   * `us-federal-form-990-n` and was told to file the e-Postcard — a return the
   * IRS does not permit it to file at any receipts level, because it files Form
   * 990-PF instead. Defaulting this to `false` would restore exactly that
   * answer for every entity that has not been asked. Under-filing is the error
   * direction this pack exists to avoid, so the 990 family is reported
   * **indeterminate** until somebody answers, and the consumer is expected to
   * ask.
   *
   * Public charity, foundation, and "nobody has told us" are three states, not
   * two. Anything storing this must keep them three — a `NOT NULL DEFAULT 0`
   * column collapses the third into the wrong one of the other two.
   *
   * Scope: it says nothing about 509(a)(3) **supporting organisations**, which
   * the IRS excludes from Form 990-N under a separate and differently-shaped
   * carve-out. See `docs/prd/private-foundation-fact.md` for why that needs its
   * own fact and a change to the 990-EZ floor rather than a reuse of this one.
   */
  isPrivateFoundation?: boolean;

  /**
   * Whether this 501(c)(3) is a **section 509(a)(3) supporting organisation**.
   *
   * A second carve-out from Form 990-N, on a different authority from
   * `isPrivateFoundation` and therefore a second fact rather than a widening of
   * the first. Rev. Proc. 2011-15, section 3.01, relieves from the annual-return
   * requirement an organisation described in section 501(c) "(other than a
   * private foundation **or a section 509(a)(3) supporting organization**)"
   * whose gross receipts are normally not more than $50,000 - and section 3.03
   * makes Form 990-N the notice such a relieved organisation files instead. A
   * supporting organisation is outside that relief, so it files Form 990 or
   * Form 990-EZ however small it is. The exclusion is statutory in origin: the
   * Pension Protection Act of 2006 removed the Secretary's authority under
   * section 6033(a)(3)(B) to relieve supporting organisations at all
   * (Rev. Proc. 2011-15, section 2.04).
   *
   * **No default, for the same reason `isPrivateFoundation` has none.** Reading
   * an unanswered question as "not a supporting organisation" restores exactly
   * the under-filing this fact removes, for every entity that predates it.
   *
   * Scope, stated because a partial carve-out modelled as a whole one is worse
   * than none: section 6033(a)(3)(A)(ii) with (a)(3)(C)(iv) keeps a mandatory
   * exception for an organisation "operated, supervised, or controlled by or in
   * connection with a religious organization" whose gross receipts are normally
   * not more than $5,000, and such an organisation may still use Form 990-N.
   * **That exception is not modelled.** It cannot be expressed in the v1 rule
   * schema, which allows one level of `anyOf` and no nesting, without breaking
   * the one-return invariant. The consequence of leaving it out is that a
   * supporting organisation this small is shown Form 990-EZ when Form 990-N
   * would have done - over-filing, the direction this pack chooses when it must
   * choose, and a return the IRS permits any organisation to file voluntarily.
   */
  isSupportingOrganization?: boolean;
}

/**
 * The fact names a rule condition is allowed to test. Enforced by the validator.
 *
 * **Not the same set as the keys of `EntityFacts`, and deliberately so.** Most
 * entries are facts somebody types in; `normalAnnualGrossReceiptsMinorUnits` is
 * derived from three of them by a rule the IRS wrote, and the rules test the
 * derived value because that is what the regulation tests.
 */
export const CONDITIONABLE_FACTS = [
  "grossRevenueMinorUnits",
  "totalAssetsMinorUnits",
  "charitableAssetsMinorUnits",
  "employeeCount",
  "solicitsCharitableContributions",
  "isPrivateFoundation",
  "isSupportingOrganization",
  // DERIVED, not supplied. See `deriveFactValues` in `derived.ts` - it is
  // computed from `grossRevenueMinorUnits` and the two prior-year facts per
  // Rev. Proc. 2011-15 section 4. Conditionable because the rules test it; not
  // a member of `EntityFacts` because nobody enters it.
  "normalAnnualGrossReceiptsMinorUnits",
] as const;
export type ConditionableFact = (typeof CONDITIONABLE_FACTS)[number];

export function isEntityType(value: unknown): value is EntityType {
  return ENTITY_TYPES.includes(value as EntityType);
}
