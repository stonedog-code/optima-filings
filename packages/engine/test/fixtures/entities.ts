/**
 * Fixture entities. Obviously fake, on purpose.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * This repo is public. A fixture built from a real organisation would publish
 * its EIN, formation date and revenue permanently, so every name here is
 * plainly invented and every number is round.
 */

import type { EntityFacts } from "../../src/facts.js";

export const WA_SMALL_CHARITY: EntityFacts = {
  name: "Example Cascade Trails Association",
  entityTypes: ["501c3", "nonprofit-corp"],
  formedOn: "2021-03-15",
  homeJurisdiction: "US-WA",
  jurisdictions: ["US", "US-WA"],
  fiscalYearEnd: "12-31",
  grossRevenueMinorUnits: 4_200_000, // $42,000 — under the 990-N ceiling
  totalAssetsMinorUnits: 1_100_000,
  solicitsCharitableContributions: true,
  // A PUBLIC charity, said out loud. Before this fact existed the 990 family
  // decided itself from receipts and assets alone, which is how a private
  // foundation with modest receipts was told to file the 990-N e-Postcard —
  // a return the IRS does not permit it to file at any level (NEH-1146).
  // `undefined` is a real third state here, so leaving it off would make this
  // fixture undecidable rather than making it a public charity.
  isPrivateFoundation: false,
  isSupportingOrganization: false,
};

export const WA_LARGE_CHARITY: EntityFacts = {
  name: "Example Puget Housing Fund",
  entityTypes: ["501c3", "nonprofit-corp"],
  formedOn: "2015-09-30",
  homeJurisdiction: "US-WA",
  jurisdictions: ["US", "US-WA"],
  fiscalYearEnd: "06-30", // deliberately not a calendar year
  grossRevenueMinorUnits: 310_000_000, // $3.1M
  totalAssetsMinorUnits: 890_000_000,
  solicitsCharitableContributions: true,
  isPrivateFoundation: false,
  isSupportingOrganization: false,
};

export const OR_LLC: EntityFacts = {
  name: "Example Willamette Woodworks LLC",
  entityTypes: ["llc"],
  formedOn: "2023-01-31", // month-end formation, to exercise clamping
  homeJurisdiction: "US-OR",
  jurisdictions: ["US-OR"],
  fiscalYearEnd: "12-31",
};

/**
 * Formed mid-month, which is the only shape that can catch the Oregon bug.
 *
 * `OR_LLC` above is formed on the 31st, so the end of its anniversary month IS
 * its anniversary and a month-end rule agrees with an anniversary rule by
 * accident. Every Oregon assertion passed that way while the rule was wrong by
 * up to 30 days for everyone else (NEH-400).
 *
 * The 14th agrees with nothing: it is not a month end, not a leap day, and not
 * the first. A rule that computes the wrong thing cannot produce this date.
 */
export const OR_NONPROFIT_MID_MONTH: EntityFacts = {
  name: "Example Deschutes Trails Alliance",
  entityTypes: ["501c3", "nonprofit-corp"],
  formedOn: "2019-06-14",
  homeJurisdiction: "US-OR",
  jurisdictions: ["US-OR"],
  fiscalYearEnd: "12-31",
};

/**
 * An Oregon corporation formed on a leap day.
 *
 * ORS defines the anniversary as **28 February** where it would otherwise fall
 * on 29 February. `dateInMonth` already clamps, so the statute and the engine
 * agree without a special case — this pins that they keep agreeing, in both a
 * common year and a leap year.
 *
 * **It cannot detect the NEH-400 bug**, and it is worth saying so plainly:
 * February's month end is the 28th or 29th, which is exactly where a leap-day
 * anniversary clamps to, so `formation-month` and `formation-anniversary`
 * produce identical dates here. These assertions passed before the fix and
 * after it. Only [[OR_NONPROFIT_MID_MONTH]] distinguishes the two anchors —
 * which is the same trap that let the bug ship, since the only Oregon fixture
 * at the time was formed on the 31st.
 */
export const OR_CORP_LEAP_DAY: EntityFacts = {
  name: "Example Cascade Locks Instruments Inc.",
  entityTypes: ["c-corp"],
  formedOn: "2024-02-29",
  homeJurisdiction: "US-OR",
  jurisdictions: ["US-OR"],
  fiscalYearEnd: "12-31",
};

export const DE_CORP: EntityFacts = {
  name: "Example Nautilus Robotics Inc.",
  entityTypes: ["c-corp"],
  formedOn: "2024-02-29", // leap-day formation
  homeJurisdiction: "US-DE",
  jurisdictions: ["US-DE"],
  fiscalYearEnd: "12-31",
};

/** Registered in Delaware and foreign-qualified in Washington. */
export const MULTI_STATE_CORP: EntityFacts = {
  name: "Example Rainier Analytics Inc.",
  entityTypes: ["c-corp"],
  formedOn: "2022-07-10",
  homeJurisdiction: "US-DE",
  jurisdictions: ["US-DE", "US-WA"],
  fiscalYearEnd: "12-31",
  registeredOn: { "US-WA": "2023-04-01" },
};

/**
 * Modest receipts, large endowment.
 *
 * The entity the AND-only condition grammar got wrong: under the receipts
 * threshold, far over the assets one, and so owing a full Form 990 while being
 * told it owed nothing. A false negative — the user sees a clean calendar and
 * misses a filing.
 */
export const ENDOWED_CHARITY: EntityFacts = {
  name: "Example Kitsap Heritage Endowment",
  entityTypes: ["501c3", "nonprofit-corp"],
  formedOn: "2010-05-20",
  homeJurisdiction: "US-WA",
  jurisdictions: ["US", "US-WA"],
  fiscalYearEnd: "12-31",
  grossRevenueMinorUnits: 8_000_000, // $80,000 — under the $200k receipts test
  totalAssetsMinorUnits: 1_200_000_000, // $12M — far over the $500k assets test
  solicitsCharitableContributions: false,
  isPrivateFoundation: false,
  isSupportingOrganization: false,
};

/**
 * Endowed, but does not solicit.
 *
 * The organisation the WA charity rule used to miss entirely: it takes no
 * donations from the public, so the soliciting test is a firm NO, but it holds
 * far more than $250,000 in charitable assets and must register anyway.
 */
export const ENDOWED_NON_SOLICITING_CHARITY: EntityFacts = {
  name: "Example Skagit Conservancy Endowment",
  entityTypes: ["501c3", "nonprofit-corp"],
  formedOn: "2008-04-10",
  homeJurisdiction: "US-WA",
  jurisdictions: ["US", "US-WA"],
  fiscalYearEnd: "12-31",
  grossRevenueMinorUnits: 3_000_000,
  totalAssetsMinorUnits: 900_000_000,
  charitableAssetsMinorUnits: 800_000_000, // $8M, far over the $250k line
  solicitsCharitableContributions: false,
  isPrivateFoundation: false,
  isSupportingOrganization: false,
};

/**
 * A soliciting charity whose accounting year ends 30 June.
 *
 * Exists for one reason: at +11 months its Washington renewal lands on
 * **2026-05-31, a Sunday**, which is the only way to test that the deadline
 * rolls BACKWARD to Friday 29 May rather than forward to Monday 1 June.
 *
 * A Sunday rather than a Saturday deliberately. Saturday distinguishes the two
 * directions by three days; Sunday exercises the -2 branch and still lands on a
 * different day under each, so a fixture that passed under the wrong
 * implementation is impossible. The repo has been caught by the opposite
 * before: every Oregon fixture was formed on the 31st, so `formation-month` and
 * `formation-anniversary` agreed and the whole suite endorsed the wrong anchor.
 *
 * A June year end is also just common for nonprofits, so this is a real
 * organisation shape rather than a date chosen to make a test go green.
 */
export const JUNE_YEAR_END_SOLICITING_CHARITY: EntityFacts = {
  name: "Example Cascade Watershed Alliance",
  entityTypes: ["501c3", "nonprofit-corp"],
  formedOn: "2011-09-14",
  homeJurisdiction: "US-WA",
  jurisdictions: ["US", "US-WA"],
  fiscalYearEnd: "06-30",
  grossRevenueMinorUnits: 1_200_000,
  totalAssetsMinorUnits: 4_000_000,
  solicitsCharitableContributions: true,
  isPrivateFoundation: false,
  isSupportingOrganization: false,
};

/**
 * A charity that has not told us its revenue. Drives the indeterminate path.
 *
 * It HAS answered the foundation question, deliberately: exactly one unknown,
 * so an assertion about the revenue path cannot be satisfied by a different
 * missing fact. [[FOUNDATION_QUESTION_UNANSWERED]] is the fixture for the
 * other one.
 */
export const CHARITY_WITHOUT_REVENUE: EntityFacts = {
  name: "Example Olympic Literacy Project",
  entityTypes: ["501c3", "nonprofit-corp"],
  formedOn: "2020-11-05",
  homeJurisdiction: "US-WA",
  jurisdictions: ["US", "US-WA"],
  fiscalYearEnd: "12-31",
  solicitsCharitableContributions: true,
  isPrivateFoundation: false,
  isSupportingOrganization: false,
};

/**
 * A private foundation, and the entity NEH-1146 was reported for.
 *
 * Its receipts and assets are both small — the shape that used to match
 * `us-federal-form-990-n` and produce a date for the e-Postcard. **A private
 * foundation may never file Form 990-N, at any receipts level**; it files Form
 * 990-PF, and the IRS lists it among the organisations not permitted to use the
 * e-Postcard. So the numbers here are not incidental: an assertion built on a
 * foundation with large receipts would pass under the old rules too, because
 * 990-N would already have been ruled out on the amount. Only a SMALL
 * foundation distinguishes the fix from the bug.
 *
 * `entityTypes` is `["501c3"]` alone rather than also `nonprofit-corp`, which
 * keeps this fixture off the state annual report and makes the federal
 * assertions read without a second obligation in the way.
 */
export const PRIVATE_FOUNDATION: EntityFacts = {
  name: "Example Harbor Light Family Foundation",
  entityTypes: ["501c3"],
  formedOn: "2015-04-02",
  homeJurisdiction: "US-WA",
  jurisdictions: ["US", "US-WA"],
  fiscalYearEnd: "12-31",
  grossRevenueMinorUnits: 2_000_000, // $20,000 — well under the 990-N ceiling
  totalAssetsMinorUnits: 3_000_000, // $30,000 — well under every other line
  solicitsCharitableContributions: false,
  isPrivateFoundation: true,
  // Answered even though no rule needs it from a foundation: the 990/990-EZ/N
  // rules are already ruled out by `isPrivateFoundation eq false` being a known
  // FALSE, which short-circuits before any other condition is read. Stated
  // anyway so the fixture is a complete organisation rather than one that
  // happens to be saved by evaluation order.
  isSupportingOrganization: false,
};

/**
 * Identical to [[PRIVATE_FOUNDATION]] except that nobody has asked.
 *
 * Every entity that existed before the question did looks like this, so it is
 * the common case rather than an edge one. The engine must report the whole 990
 * family as **indeterminate** for it — naming the question — rather than
 * deciding it. Reading the absence as "not a foundation" is the exact
 * under-filing the fact was added to remove, and it is the answer a default
 * would silently restore.
 */
export const FOUNDATION_QUESTION_UNANSWERED: EntityFacts = {
  name: "Example Harbor Light Trust",
  entityTypes: ["501c3"],
  formedOn: "2015-04-02",
  homeJurisdiction: "US-WA",
  jurisdictions: ["US", "US-WA"],
  fiscalYearEnd: "12-31",
  grossRevenueMinorUnits: 2_000_000,
  totalAssetsMinorUnits: 3_000_000,
  solicitsCharitableContributions: false,
};

/**
 * A section 509(a)(3) supporting organisation, small.
 *
 * The entity this pack used to get wrong. It is a 501(c)(3), it is not a
 * private foundation, and its receipts are far under $50,000 - so before
 * `isSupportingOrganization` existed it matched `us-federal-form-990-n` and was
 * given a date for the e-Postcard. **Rev. Proc. 2011-15 sec. 3.01 relieves from
 * the annual return only an organisation "other than a private foundation or a
 * § 509(a)(3) supporting organization"**, and sec. 3.03 makes Form 990-N the
 * notice a relieved organisation files. A supporting organisation is outside
 * the relief, so it files Form 990 or Form 990-EZ at any size.
 *
 * The numbers are not incidental. A supporting organisation with LARGE receipts
 * would already have been excluded from 990-N on the amount, so an assertion
 * built on one would have passed before the fix as well - the same trap the
 * private-foundation fixture was written to avoid. Only a SMALL supporting
 * organisation distinguishes the fix from the bug.
 *
 * Its assets are under $500,000 and its receipts under $200,000, so the return
 * it owes is the 990-EZ. That is the second half of the fix: excluding it from
 * 990-N without giving Form 990-EZ a supporting-organisation branch would drop
 * it below that rule's receipts floor and it would match NOTHING - silence,
 * which is under-filing wearing a clean calendar.
 */
export const SUPPORTING_ORGANIZATION: EntityFacts = {
  name: "Example Whatcom Library Friends Trust",
  entityTypes: ["501c3"],
  formedOn: "2012-06-18",
  homeJurisdiction: "US-WA",
  jurisdictions: ["US", "US-WA"],
  fiscalYearEnd: "12-31",
  grossRevenueMinorUnits: 1_800_000, // $18,000 - far under the $50,000 line
  totalAssetsMinorUnits: 9_000_000, // $90,000 - under the $500,000 line
  solicitsCharitableContributions: false,
  isPrivateFoundation: false,
  isSupportingOrganization: true,
};

/**
 * Identical to [[SUPPORTING_ORGANIZATION]] except that nobody has asked.
 *
 * Every entity that existed before the question did looks like this, so it is
 * the common case rather than an edge one - exactly as it was for the
 * foundation question. The whole 990 family must come back **indeterminate**,
 * naming the question, rather than being decided. Reading the absence as "not a
 * supporting organisation" is the under-filing the fact was added to remove.
 */
export const SUPPORTING_ORGANIZATION_QUESTION_UNANSWERED: EntityFacts = {
  name: "Example Whatcom Library Friends Fund",
  entityTypes: ["501c3"],
  formedOn: "2012-06-18",
  homeJurisdiction: "US-WA",
  jurisdictions: ["US", "US-WA"],
  fiscalYearEnd: "12-31",
  grossRevenueMinorUnits: 1_800_000,
  totalAssetsMinorUnits: 9_000_000,
  solicitsCharitableContributions: false,
  isPrivateFoundation: false,
};

/**
 * One large year, two small ones. Averages BELOW $50,000.
 *
 * $60,000 + $30,000 + $30,000 = $120,000 over three years, so the average is
 * **$40,000** and Rev. Proc. 2011-15 sec. 4(3) says this organisation's gross
 * receipts are normally not more than $50,000. It may file the e-Postcard.
 *
 * The arithmetic is done here rather than taken from the engine, deliberately:
 * a fixture whose expectation is computed by the function under test agrees
 * with that function by construction and proves nothing. $120,000 / 3 =
 * $40,000, which is $10,000 clear of the line - a margin, not a boundary, so
 * this fixture cannot pass or fail on a rounding question.
 *
 * A single-year test says $60,000 and sends it to Form 990-EZ. That direction
 * is over-filing, which this pack tolerates when it must choose; it is the
 * gentler of the two errors a one-year test makes, and it is not the reason the
 * averaging was implemented. See [[LEAN_YEAR_AFTER_LARGE_YEARS_CHARITY]] for
 * the reason.
 */
export const BEQUEST_YEAR_CHARITY: EntityFacts = {
  name: "Example Chelan Trailhead Society",
  entityTypes: ["501c3"],
  formedOn: "2009-02-11",
  homeJurisdiction: "US-WA",
  jurisdictions: ["US", "US-WA"],
  fiscalYearEnd: "12-31",
  grossRevenueMinorUnits: 6_000_000, // $60,000 - a one-off legacy year
  grossRevenuePriorYear1MinorUnits: 3_000_000, // $30,000
  grossRevenuePriorYear2MinorUnits: 3_000_000, // $30,000
  totalAssetsMinorUnits: 4_000_000,
  solicitsCharitableContributions: true,
  isPrivateFoundation: false,
  isSupportingOrganization: false,
};

/**
 * One lean year after two large ones. Averages ABOVE $50,000.
 *
 * $20,000 + $200,000 + $200,000 = $420,000 over three years, so the average is
 * **$140,000** - far over the line, and this organisation may NOT file the
 * e-Postcard. Its current-year receipts are under $200,000 and its assets under
 * $500,000, so the return it owes is the 990-EZ.
 *
 * **This is the fixture that matters.** A single-year test reads $20,000 and
 * names Form 990-N - a return this organisation is not eligible to file. That
 * is under-filing, the error direction this pack exists to avoid, and it is why
 * the averaging is implemented rather than the limitation merely being written
 * down. The issue that reported the single-year test called its error direction
 * "conservative"; measured against Rev. Proc. 2011-15 sec. 4 it is conservative
 * in one direction and hazardous in the other, and the ticket's premise held
 * only for the half it had looked at.
 *
 * $140,000 against a $50,000 line is a wide margin on purpose, for the same
 * reason [[BEQUEST_YEAR_CHARITY]]'s is: a fixture that sits on a boundary tests
 * an operator, and a fixture that sits well clear of one tests the model.
 */
export const LEAN_YEAR_AFTER_LARGE_YEARS_CHARITY: EntityFacts = {
  name: "Example Yakima Riverkeepers Alliance",
  entityTypes: ["501c3"],
  formedOn: "2006-08-22",
  homeJurisdiction: "US-WA",
  jurisdictions: ["US", "US-WA"],
  fiscalYearEnd: "12-31",
  grossRevenueMinorUnits: 2_000_000, // $20,000 - a lean year
  grossRevenuePriorYear1MinorUnits: 20_000_000, // $200,000
  grossRevenuePriorYear2MinorUnits: 20_000_000, // $200,000
  totalAssetsMinorUnits: 4_000_000,
  solicitsCharitableContributions: true,
  isPrivateFoundation: false,
  isSupportingOrganization: false,
};

/**
 * Exactly on the $50,000 line, from a three-year average.
 *
 * $45,000 + $50,000 + $55,000 = $150,000, average **exactly $50,000**. Rev.
 * Proc. 2011-15 sec. 4(3) says "is $50,000 or less", so this organisation is
 * relieved and files the e-Postcard - the `lte` operator, not `lt`, and an
 * off-by-one there would be invisible to every other fixture.
 *
 * The three years are deliberately unequal. Three identical years would also
 * average $50,000, and would pass just as well against an engine that ignored
 * the prior years entirely - which is precisely the fixture-that-tests-nothing
 * this repo has been caught by twice.
 */
export const EXACTLY_AT_THE_AVERAGE_LINE_CHARITY: EntityFacts = {
  name: "Example Klickitat Ridge Arts Council",
  entityTypes: ["501c3"],
  formedOn: "2011-01-09",
  homeJurisdiction: "US-WA",
  jurisdictions: ["US", "US-WA"],
  fiscalYearEnd: "12-31",
  grossRevenueMinorUnits: 4_500_000, // $45,000
  grossRevenuePriorYear1MinorUnits: 5_000_000, // $50,000
  grossRevenuePriorYear2MinorUnits: 5_500_000, // $55,000
  totalAssetsMinorUnits: 2_000_000,
  solicitsCharitableContributions: true,
  isPrivateFoundation: false,
  isSupportingOrganization: false,
};

/**
 * One cent over the $50,000 average.
 *
 * $45,000.00 + $50,000.00 + $55,000.01 = $150,000.01, so the average is
 * $50,000.0033 and the organisation is NOT relieved. The pair to
 * [[EXACTLY_AT_THE_AVERAGE_LINE_CHARITY]], and the reason the engine rounds the
 * average UP: `Math.ceil(15_000_001 / 3)` is `5_000_001`, which is over the
 * line, and for an integer threshold that ceiling is the exact integer encoding
 * of the real-valued comparison rather than a conservative nudge.
 *
 * A `Math.floor` would give $50,000.00 here and quietly qualify this
 * organisation for a return it may not file - one cent of under-filing, and
 * exactly the kind of defect no fixture at a round number can see.
 *
 * **THE THIRD FIGURE WAS $55,000.03 AND THAT MADE THIS FIXTURE VACUOUS.** The
 * sum was 15_000_003, which divides by three exactly, so floor and ceil agreed
 * and the fixture passed against both roundings. Found by planting `Math.floor`
 * and watching nothing fail. The sum must not be divisible by the number of
 * years - that is the whole property this fixture exists to exercise, and it is
 * not visible from reading the numbers.
 */
export const ONE_CENT_OVER_THE_AVERAGE_LINE_CHARITY: EntityFacts = {
  name: "Example Klickitat Ridge Arts Guild",
  entityTypes: ["501c3"],
  formedOn: "2011-01-09",
  homeJurisdiction: "US-WA",
  jurisdictions: ["US", "US-WA"],
  fiscalYearEnd: "12-31",
  grossRevenueMinorUnits: 4_500_000, // $45,000.00
  grossRevenuePriorYear1MinorUnits: 5_000_000, // $50,000.00
  grossRevenuePriorYear2MinorUnits: 5_500_001, // $55,000.01
  totalAssetsMinorUnits: 2_000_000,
  solicitsCharitableContributions: true,
  isPrivateFoundation: false,
  isSupportingOrganization: false,
};
