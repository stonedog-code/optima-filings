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
