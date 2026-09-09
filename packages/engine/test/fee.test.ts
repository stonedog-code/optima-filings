/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * A fee has three states and every surface renders all three. These are the
 * assertions that stop a MINIMUM being shown as a price — the defect NEH-403
 * exists to remove, one layer below the schema.
 */
import { feeAmountText, feeExplanation, formatMinorUnits } from "../src/fee.js";
import type { Obligation } from "../src/evaluate.js";

const base: Obligation = {
  ruleId: "us-test-rule",
  title: "Test Filing",
  agency: "Test Agency",
  jurisdiction: "US-WA",
  citation: "RCW 1.2.3",
  status: "active",
  lastVerified: "2026-09-09",
  dueOn: "2026-12-31",
};

describe("formatMinorUnits", () => {
  it("keeps integer arithmetic to the last step", () => {
    expect(formatMinorUnits(6000)).toBe("$60.00");
    expect(formatMinorUnits(175_00)).toBe("$175.00");
    expect(formatMinorUnits(25_005_000)).toBe("$250,050.00");
    // The case a float would round wrong.
    expect(formatMinorUnits(2999)).toBe("$29.99");
  });
});

describe("feeAmountText", () => {
  it("renders an exact fee as one number", () => {
    expect(feeAmountText({ ...base, feeMinorUnits: 6000, currency: "USD" })).toBe(
      "$60.00",
    );
  });

  it("renders a bounded range as a range, NOT as its minimum", () => {
    // The whole point. Delaware's rule showed $50 — the report fee alone — for
    // a filing that costs between $225 and $250,050, and a consumer that
    // collapsed the range to its floor would restore that defect exactly.
    const text = feeAmountText({
      ...base,
      currency: "USD",
      feeRange: {
        basis: "computed",
        minimumMinorUnits: 22_500,
        maximumMinorUnits: 25_005_000,
        explanation: "Computed per corporation.",
        currency: "USD",
      },
    });
    expect(text).toBe("$225.00 – $250,050.00");
    expect(text).not.toBe("$225.00");
  });

  it("says 'at least' when the statute sets a floor and no ceiling", () => {
    expect(
      feeAmountText({
        ...base,
        currency: "USD",
        feeRange: {
          basis: "computed",
          minimumMinorUnits: 17_500,
          explanation: "No ceiling in the statute.",
          currency: "USD",
        },
      }),
    ).toBe("at least $175.00");
  });

  it("says 'up to' when only a ceiling is known", () => {
    expect(
      feeAmountText({
        ...base,
        currency: "USD",
        feeRange: {
          basis: "conditional",
          maximumMinorUnits: 6000,
          explanation: "Depends on a certification.",
          currency: "USD",
        },
      }),
    ).toBe("up to $60.00");
  });

  it("is undefined when no fee was ever recorded — never zero, never free", () => {
    // "Nobody established the cost" and "this filing is free" are different
    // claims, and only one of them is ours to make.
    expect(feeAmountText(base)).toBeUndefined();
  });

  it("renders a recorded zero as $0.00, which is a real answer", () => {
    expect(feeAmountText({ ...base, feeMinorUnits: 0, currency: "USD" })).toBe(
      "$0.00",
    );
  });
});

describe("feeExplanation", () => {
  it("carries the reason for a range", () => {
    expect(
      feeExplanation({
        ...base,
        currency: "USD",
        feeRange: {
          basis: "conditional",
          minimumMinorUnits: 2000,
          maximumMinorUnits: 6000,
          explanation: "Either $20 or $60, depending on a certification.",
          currency: "USD",
        },
      }),
    ).toMatch(/certification/);
  });

  it("has nothing to say about an exact fee", () => {
    expect(
      feeExplanation({ ...base, feeMinorUnits: 6000, currency: "USD" }),
    ).toBeUndefined();
  });
});
