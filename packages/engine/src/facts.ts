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

  /**
   * Contributions **raised** in the accounting year, in integer minor units.
   *
   * The gross amount received in response to charitable solicitation - gifts,
   * donations, grants and pledges collected from the public - **before**
   * deducting the cost of raising it. Gross, because a threshold on the net
   * would let an organisation spend its way under the line.
   *
   * **Deliberately not `grossRevenueMinorUnits`, and the difference is the
   * whole reason this fact exists.** A nonprofit's gross revenue also carries
   * program-service revenue (ticket sales, tuition, clinic fees), investment
   * income, and government contracts - none of which is money it *raised* by
   * asking. A theatre with $500,000 of ticket sales and $12,000 of donations
   * has raised $12,000. Testing gross revenue against a solicitation threshold
   * would catch that theatre and, symmetrically, an endowment-funded grantmaker
   * whose revenue is investment income. Reusing the existing fact would have
   * been one line and wrong in both directions.
   *
   * **Scope, because Washington does not define the term and this is therefore
   * this pack's reading rather than the statute's.** RCW 19.09.081(1) says
   * "raising less than fifty thousand dollars in any accounting year" and
   * leaves "raising" undefined; RCW 19.09.020's definition of "solicitation"
   * is what fixes the sense used here - an oral or written request for a
   * contribution. Where a receipt is genuinely ambiguous (a sponsorship that is
   * part gift and part advertising), counting it IN is the reading this pack
   * takes, because a larger figure can only push an organisation toward
   * registering and over-filing is the direction chosen when one must be.
   *
   * No default. An organisation that has not answered leaves the Washington
   * solicitation rule undecided rather than being told either way - see
   * `isPrivateFoundation` for why an absent fact is three states and not two.
   */
  contributionsRaisedMinorUnits?: number;

  /**
   * Whether **all** the organisation's activities, fundraising included, are
   * carried on by people who are unpaid for their services.
   *
   * The second limb of the RCW 19.09.081(1) exemption, quoted verbatim: "when
   * all the activities of the organization, including all fund-raising
   * activities, are carried on by persons who are unpaid for their services".
   *
   * **"All the activities", not "the fundraising".** One paid part-time
   * bookkeeper is enough to fail this, even if every dollar is raised by
   * volunteers - the statute reaches the whole organisation and only then names
   * fundraising to close the obvious gap. A fact called `usesPaidFundraisers`
   * would read as the same question and answer a narrower one, which is why
   * this is named for the whole test.
   *
   * Unpaid *for their services*: reimbursing a volunteer's mileage is not pay.
   *
   * No default, for the reason above and one specific to this fact - a `false`
   * default would silently deny the exemption to every organisation that has
   * not been asked, which is the over-filing this fact exists to remove, and a
   * `true` default would grant it to every organisation that has not been
   * asked, which is under-filing. Neither is honest; the third state is.
   */
  allFundraisingUnpaid?: boolean;

  /**
   * Whether any part of the organisation's assets or income inures to, or is
   * paid to, an officer, director, member or trustee.
   *
   * The **third** limb of RCW 19.09.081(1), and it is modelled rather than
   * dropped because the exemption is a conjunction: omitting a limb makes the
   * exemption we implement *broader* than the statute's, and a broader
   * exemption is under-filing - the one direction this pack does not accept.
   * Whether it was worth a whole fact is argued in
   * `docs/rule-verification/2026-09-09-wa-charity-exemption-facts.md`; the
   * short answer is that the organisation it would otherwise mis-exempt is a
   * real one and that the question
   * is only ever asked of an organisation the first two limbs have already
   * placed inside the exemption.
   *
   * Stated **positively** - true means inurement exists and the organisation
   * must register - so the rule reads as a plain condition rather than as a
   * negation of a negation. The statute phrases it the other way ("no part
   * of ... inures"), so read the sign carefully when checking this against it.
   *
   * The statutory carve-out is carried in the meaning: a payment made to
   * someone "as part of a charitable class benefited by the charitable
   * organization" is **not** inurement. A trustee of a scholarship fund whose
   * child wins a scholarship on the same terms as every other applicant has not
   * caused inurement.
   *
   * Scope: this fact exists for the Washington exemption and means what RCW
   * 19.09.081(1) means by it. It is **not** the federal section 501(c)(3)
   * inurement prohibition, which is absolute, differently scoped ("private
   * shareholder or individual"), and would be a different fact if a rule ever
   * needed it. Nothing here should be read as an opinion on exempt status.
   *
   * No default. An unanswered question leaves the rule undecided and the
   * question attached, which is the honest outcome for a small all-volunteer
   * charity that has answered the other two limbs.
   */
  assetsOrIncomeInureToInsiders?: boolean;

  /**
   * The portion of charitable assets **invested for income-producing
   * purposes**, in integer minor units.
   *
   * A narrower quantity than `charitableAssetsMinorUnits`, and a separate fact
   * rather than a redefinition of it, because changing what an existing fact
   * means is the one change this file says is not cheap: every stored figure
   * and every self-hoster's answer would silently start meaning something else.
   *
   * WAC 434-120-305 requires a trustee to register where "the trustee holds
   * assets, **invested for income-producing purposes**, exceeding a value of
   * two hundred fifty thousand dollars". That qualifier is doing real work. A
   * land trust holding $4,000,000 of conservation easements, a museum holding a
   * collection, a food bank holding the warehouse it operates from - each holds
   * charitable assets far over the line and none of them holds assets *invested
   * for income*. Testing the broader figure told all three to register and pay
   * for a filing the regulation does not ask of them.
   *
   * What counts: an endowment, an invested reserve, a portfolio, rental
   * property held as an investment. What does not: property in direct
   * charitable use, however valuable.
   *
   * **`charitableAssetsMinorUnits` keeps its meaning and stays in the model.**
   * It is the quantity several other states test, and it is what a self-hoster
   * has already answered; narrowing it in place would have quietly re-answered
   * a question on their behalf. After this change no shipped rule conditions on
   * it, which is a fact about the current pack rather than about the fact.
   *
   * No default. An organisation that has answered only the broader figure gets
   * an undecided trust registration and a question naming this one, which is
   * the correct outcome: we do not know, and the two figures differ for exactly
   * the organisations the distinction was drawn for.
   */
  incomeProducingCharitableAssetsMinorUnits?: number;
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
  "contributionsRaisedMinorUnits",
  "allFundraisingUnpaid",
  "assetsOrIncomeInureToInsiders",
  "incomeProducingCharitableAssetsMinorUnits",
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
