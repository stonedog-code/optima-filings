/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * The "normally not more than $50,000" averaging test, on its own.
 *
 * Every expectation here is arithmetic done by hand from Rev. Proc. 2011-15
 * section 4 and written in the assertion. **None of it is produced by the
 * function under test**, which is the difference between a regression corpus
 * and a fixture that agrees with the implementation by construction.
 */

import {
  deriveFactValues,
  deriveNormalAnnualGrossReceipts,
  reportableInputsFor,
} from "../src/derived.js";
import { CONDITIONABLE_FACTS, type EntityFacts } from "../src/facts.js";

const BASE: EntityFacts = {
  name: "Example Fixture Organisation",
  entityTypes: ["501c3"],
  formedOn: "2010-01-01",
  homeJurisdiction: "US-WA",
  jurisdictions: ["US", "US-WA"],
  fiscalYearEnd: "12-31",
};

describe("normally annual gross receipts", () => {
  it("is the single year when that is all there is", () => {
    // Not the regulation's answer for a three-year-old organisation, and said
    // so out loud in derived.ts: it is the answer available when nobody has
    // supplied prior years, and it is what this pack did for every entity
    // before the prior-year facts existed.
    expect(
      deriveNormalAnnualGrossReceipts({ ...BASE, grossRevenueMinorUnits: 4_200_000 }),
    ).toBe(4_200_000);
  });

  it("averages three supplied years", () => {
    // $60,000 + $30,000 + $30,000 = $120,000; $120,000 / 3 = $40,000.
    expect(
      deriveNormalAnnualGrossReceipts({
        ...BASE,
        grossRevenueMinorUnits: 6_000_000,
        grossRevenuePriorYear1MinorUnits: 3_000_000,
        grossRevenuePriorYear2MinorUnits: 3_000_000,
      }),
    ).toBe(4_000_000);
  });

  it("averages two when only one prior year is supplied", () => {
    // $20,000 + $40,000 = $60,000; $60,000 / 2 = $30,000.
    expect(
      deriveNormalAnnualGrossReceipts({
        ...BASE,
        grossRevenueMinorUnits: 2_000_000,
        grossRevenuePriorYear1MinorUnits: 4_000_000,
      }),
    ).toBe(3_000_000);
  });

  it("ignores a year two figure with no year one, rather than averaging a gap", () => {
    // Somebody who filled the older box and left the newer one blank has told
    // us less than they think. Averaging across a hole would invent a figure
    // for a year nobody described, so the run that starts at the current year
    // is the only reading that cannot be wrong.
    expect(
      deriveNormalAnnualGrossReceipts({
        ...BASE,
        grossRevenueMinorUnits: 2_000_000,
        grossRevenuePriorYear2MinorUnits: 90_000_000,
      }),
    ).toBe(2_000_000);
  });

  it("is unknown when the current year is unknown", () => {
    // Clause (3) names the year the return is filed for explicitly, so without
    // it there is nothing to average. Unknown, not zero: a zero would read as
    // "earned nothing" and qualify a large charity for the postcard return.
    expect(
      deriveNormalAnnualGrossReceipts({
        ...BASE,
        grossRevenuePriorYear1MinorUnits: 3_000_000,
        grossRevenuePriorYear2MinorUnits: 3_000_000,
      }),
    ).toBeUndefined();
  });

  it("rounds UP, which is exact for an integer threshold", () => {
    // $45,000.00 + $50,000.00 + $55,000.01 = $150,000.01, so the true average
    // is $50,000.0033 — over the line. Ceil gives 5_000_001; floor would give
    // 5_000_000 and quietly qualify the organisation for a return it may not
    // file. `ceil(x) <= T` holds exactly when `x <= T` for integer T, so this
    // is the exact encoding of the comparison, not a safety margin.
    //
    // THE THIRD FIGURE WAS 5_500_003 AND THAT MADE THIS ASSERTION VACUOUS: the
    // sum was 15_000_003, which divides by three exactly, so floor and ceil
    // returned the same number and the test passed against BOTH. Found by
    // planting `Math.floor` and watching nothing fail — a green over a case
    // that could not distinguish the two. The sum must not be divisible by the
    // number of years, and 15_000_001 is not.
    expect(
      deriveNormalAnnualGrossReceipts({
        ...BASE,
        grossRevenueMinorUnits: 4_500_000,
        grossRevenuePriorYear1MinorUnits: 5_000_000,
        grossRevenuePriorYear2MinorUnits: 5_500_001,
      }),
    ).toBe(5_000_001);
  });

  it("lands exactly on the line when the three years average to it", () => {
    // $45,000 + $50,000 + $55,000 = $150,000; average exactly $50,000. Rev.
    // Proc. 2011-15 sec. 4(3) says "$50,000 or less", so this is inside.
    expect(
      deriveNormalAnnualGrossReceipts({
        ...BASE,
        grossRevenueMinorUnits: 4_500_000,
        grossRevenuePriorYear1MinorUnits: 5_000_000,
        grossRevenuePriorYear2MinorUnits: 5_500_000,
      }),
    ).toBe(5_000_000);
  });
});

describe("the resolved fact set", () => {
  it("omits a fact the entity has not supplied rather than defaulting it", () => {
    // The whole three-valued design rests on this. An `isPrivateFoundation:
    // undefined` key and an absent key both read as unknown to the evaluator,
    // but a `false` would decide the 990 family for every entity nobody has
    // asked - which is the under-filing two facts here exist to remove.
    const values = deriveFactValues(BASE);
    expect("isPrivateFoundation" in values).toBe(false);
    expect("isSupportingOrganization" in values).toBe(false);
    expect("normalAnnualGrossReceiptsMinorUnits" in values).toBe(false);
  });

  it("carries every conditionable fact an entity can supply", () => {
    // A guard on the projection, which is written fact by fact: a fact added to
    // the model and forgotten here would be silently unknown for every entity,
    // and every rule testing it would report indeterminate forever. That reads
    // as "the user has not told us" and is really "the engine never looked".
    const supplied: EntityFacts = {
      ...BASE,
      grossRevenueMinorUnits: 1,
      grossRevenuePriorYear1MinorUnits: 2,
      grossRevenuePriorYear2MinorUnits: 3,
      totalAssetsMinorUnits: 4,
      charitableAssetsMinorUnits: 5,
      employeeCount: 6,
      solicitsCharitableContributions: true,
      isPrivateFoundation: false,
      isSupportingOrganization: false,
      contributionsRaisedMinorUnits: 7,
      allFundraisingUnpaid: true,
      assetsOrIncomeInureToInsiders: false,
      incomeProducingCharitableAssetsMinorUnits: 8,
    };
    const values = deriveFactValues(supplied);
    for (const fact of CONDITIONABLE_FACTS) {
      expect(Object.keys(values)).toContain(fact);
    }
    // Non-vacuity: the loop above is worthless if the list is empty.
    expect(CONDITIONABLE_FACTS.length).toBeGreaterThan(5);
  });
});

describe("what a user is asked for when a fact cannot be resolved", () => {
  it("reports a derived fact as the input that would decide it", () => {
    // "We cannot tell yet - we need your normal annual gross receipts" names
    // something no form asks for. A question nobody can answer is the same dead
    // end as no question at all.
    expect(reportableInputsFor("normalAnnualGrossReceiptsMinorUnits")).toEqual([
      "grossRevenueMinorUnits",
    ]);
  });

  it("reports an ordinary fact as itself", () => {
    expect(reportableInputsFor("isSupportingOrganization")).toEqual([
      "isSupportingOrganization",
    ]);
  });
});
