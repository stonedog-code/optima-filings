/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { CONDITIONABLE_FACTS, type Obligation } from "@optima-compliance/engine";
import {
  CONDITIONABLE_FACT_LABELS,
  describeMissingFacts,
  daysUntil,
  entityTypeLabel,
  formatDate,
  formatFee,
  formatMoney,
  jurisdictionLabel,
  relativeDue,
  urgency,
  verificationNote,
} from "../src/lib/format.js";

const obligation: Obligation = {
  ruleId: "us-wa-sos-nonprofit-annual-report",
  title: "Annual Report",
  agency: "Washington Secretary of State",
  jurisdiction: "US-WA",
  dueOn: "2026-03-31",
  citation: "RCW 24.03A.1010",
  status: "active",
  lastVerified: "2026-08-01",
};

describe("formatMoney", () => {
  it.each([
    [6000, "$60.00"],
    [30000, "$300.00"],
    [5, "$0.05"],
    [0, "$0.00"],
    [123456789, "$1,234,567.89"],
  ])("renders %d minor units as %s", (minor, expected) => {
    expect(formatMoney(minor)).toBe(expected);
  });

  it("never loses a cent to floating point", () => {
    for (let cents = 0; cents < 500; cents += 1) {
      expect(formatMoney(cents)).toMatch(/^\$\d[\d,]*\.\d{2}$/);
    }
  });
});

describe("formatFee", () => {
  it('shows an em dash, never "$0.00", when no fee is recorded', () => {
    // Zero would claim the filing is free. What we know is that nobody
    // recorded a fee.
    expect(formatFee(obligation)).toBe("—");
  });

  it("shows a real zero fee as $0.00", () => {
    expect(formatFee({ ...obligation, feeMinorUnits: 0 })).toBe("$0.00");
  });
});

describe("formatDate", () => {
  it("is unambiguous to US and non-US readers alike", () => {
    // 03/04/2026 means two different days depending on the reader. A named
    // month cannot be misread, which matters when the value is a deadline.
    expect(formatDate("2026-03-31")).toBe("31 Mar 2026");
    expect(formatDate("2026-11-01")).toBe("1 Nov 2026");
  });
});

describe("daysUntil", () => {
  it("counts forward and backward", () => {
    expect(daysUntil("2026-01-01", "2026-01-31")).toBe(30);
    expect(daysUntil("2026-01-31", "2026-01-01")).toBe(-30);
    expect(daysUntil("2026-01-01", "2026-01-01")).toBe(0);
  });

  it("crosses a leap day correctly", () => {
    expect(daysUntil("2024-02-28", "2024-03-01")).toBe(2);
    expect(daysUntil("2025-02-28", "2025-03-01")).toBe(1);
  });

  it("crosses a year boundary", () => {
    expect(daysUntil("2026-12-31", "2027-01-01")).toBe(1);
  });
});

describe("urgency", () => {
  it.each([
    ["2026-01-01", "2025-12-25", "overdue"],
    ["2026-01-01", "2026-01-01", "due-soon"],
    ["2026-01-01", "2026-01-31", "due-soon"],
    ["2026-01-01", "2026-02-15", "upcoming"],
  ])("as of %s, %s is %s", (asOf, dueOn, expected) => {
    expect(urgency(asOf, dueOn)).toBe(expected);
  });

  it("treats today as due-soon rather than overdue", () => {
    // Something due today is still filable today. Calling it overdue would be
    // both wrong and needlessly alarming.
    expect(urgency("2026-03-31", "2026-03-31")).toBe("due-soon");
  });
});

describe("relativeDue", () => {
  it.each([
    ["2026-01-01", "2026-01-01", "due today"],
    ["2026-01-01", "2026-01-02", "due tomorrow"],
    ["2026-01-01", "2026-01-11", "in 10 days"],
    ["2026-01-02", "2026-01-01", "1 day overdue"],
    ["2026-01-11", "2026-01-01", "10 days overdue"],
  ])("as of %s, %s reads as %s", (asOf, dueOn, expected) => {
    expect(relativeDue(asOf, dueOn)).toBe(expected);
  });

  it("switches to months once a day count stops being useful", () => {
    expect(relativeDue("2026-01-01", "2026-07-01")).toBe("in about 6 months");
  });

  it("conveys overdue in words, not only in colour", () => {
    // WCAG 1.4.1: colour must never be the only signal. A screen reader gets
    // nothing from the red text.
    expect(relativeDue("2026-04-12", "2026-03-31")).toContain("overdue");
  });
});

describe("labels", () => {
  it("renders entity types the way a person would say them", () => {
    expect(entityTypeLabel("501c3")).toBe("501(c)(3)");
    expect(entityTypeLabel("llc")).toBe("LLC");
  });

  it("names jurisdictions rather than showing codes", () => {
    expect(jurisdictionLabel("US")).toBe("Federal");
    expect(jurisdictionLabel("US-WA")).toBe("Washington");
  });

  it("falls back to the raw code for anything unmapped", () => {
    // A new jurisdiction must render as "US-TX", not as blank or "undefined".
    expect(jurisdictionLabel("US-TX")).toBe("US-TX");
    expect(entityTypeLabel("co-op")).toBe("co-op");
  });
});

describe("accessible names for repeated items", () => {
  it("distinguishes two occurrences of the same action by date", () => {
    // A recurring action puts this year's and next year's on the page at once.
    // Buttons named only by title are indistinguishable to a screen reader —
    // and the labels are built from formatDate, so this is the piece that has
    // to stay unambiguous.
    expect(formatDate("2026-08-10")).not.toBe(formatDate("2027-08-10"));
  });
});

describe("verificationNote", () => {
  const ASOF = "2026-08-04";

  it("says how long ago a fresh rule was checked", () => {
    expect(verificationNote(ASOF, "2026-05-04")).toEqual({
      text: "Checked 3 months ago",
      stale: false,
    });
  });

  it("singularises one month", () => {
    expect(verificationNote(ASOF, "2026-07-04").text).toBe(
      "Checked 1 month ago",
    );
  });

  it("has wording for a rule checked within the month", () => {
    // "Checked 0 months ago" is what a naive template produces and it reads as
    // broken. This is the most common case for a freshly-authored rule.
    expect(verificationNote(ASOF, "2026-08-01")).toEqual({
      text: "Checked this month",
      stale: false,
    });
  });

  it("calls out a rule past the twelve-month threshold", () => {
    expect(verificationNote(ASOF, "2024-02-04")).toEqual({
      text: "Not checked in 30 months",
      stale: true,
    });
  });

  it("flips exactly at twelve months, not a day early or late", () => {
    // The boundary is the only place this can disagree with
    // `npm run rules:staleness --months 12`, and disagreeing there teaches
    // people to trust neither number.
    expect(verificationNote(ASOF, "2025-08-05").stale).toBe(false);
    expect(verificationNote(ASOF, "2025-08-04").stale).toBe(true);
  });

  it("states a fact rather than hedging", () => {
    // A soft "may be out of date" reads as boilerplate and gets skipped, which
    // defeats the point of surfacing staleness at all.
    const { text } = verificationNote(ASOF, "2020-01-01");
    expect(text).toMatch(/^Not checked in \d+ months$/);
    expect(text).not.toMatch(/may|might|possibly/i);
  });

  it("distinguishes fresh from stale in the text, not only the colour", () => {
    // WCAG 1.4.1 — `stale` drives colour, so the strings themselves have to
    // carry the distinction for a reader who cannot see it.
    const fresh = verificationNote(ASOF, "2026-06-04").text;
    const stale = verificationNote(ASOF, "2023-06-04").text;
    expect(fresh).not.toBe(stale);
    expect(fresh).toMatch(/^Checked/);
    expect(stale).toMatch(/^Not checked/);
  });
});

/**
 * The words a customer reads when a rule cannot be decided — NEH-1146.
 *
 * The "cannot tell yet" section used to print raw identifiers:
 * `needs isPrivateFoundation`. That is an error message, not a question, and it
 * leaks the shape of the fact model onto a screen whose entire job is to ask
 * somebody something they can answer.
 */
describe("conditionable fact labels", () => {
  it("has a label for every fact the engine can condition on", () => {
    // The `Record<ConditionableFact, string>` type already makes a missing
    // label a compile error. This is the runtime half: it catches a label added
    // as an empty string, or a key kept after the fact behind it was renamed —
    // neither of which the type notices, and both of which render as a blank in
    // the middle of a sentence.
    expect(Object.keys(CONDITIONABLE_FACT_LABELS).sort()).toEqual(
      [...CONDITIONABLE_FACTS].sort(),
    );
    for (const fact of CONDITIONABLE_FACTS) {
      expect(CONDITIONABLE_FACT_LABELS[fact].trim().length).toBeGreaterThan(3);
    }
  });

  it("never renders an identifier at a customer", () => {
    // The actual failure being guarded: the fallback in `describeMissingFacts`
    // exists so an unknown fact still renders SOMETHING, and it would happily
    // render `isPrivateFoundation` forever if nobody checked.
    for (const fact of CONDITIONABLE_FACTS) {
      expect(describeMissingFacts([fact])).not.toBe(fact);
      expect(describeMissingFacts([fact])).not.toMatch(/MinorUnits|^is[A-Z]/);
    }
  });

  it("asks the private-foundation question in words somebody could answer", () => {
    expect(describeMissingFacts(["isPrivateFoundation"])).toBe(
      "whether you are a private foundation",
    );
  });

  it("joins two facts as English, not as a CSV", () => {
    // The common case for the 990 family, and the one that reads worst as a
    // comma-separated list of field names.
    expect(
      describeMissingFacts(["grossRevenueMinorUnits", "totalAssetsMinorUnits"]),
    ).toBe("your gross revenue and your total assets");
  });

  it("joins three with commas and a final and", () => {
    expect(
      describeMissingFacts([
        "grossRevenueMinorUnits",
        "totalAssetsMinorUnits",
        "isPrivateFoundation",
      ]),
    ).toBe(
      "your gross revenue, your total assets and whether you are a private foundation",
    );
  });

  it("returns an empty string for an empty list rather than 'undefined'", () => {
    // Defensive, and the failure it prevents is visible: the literal word
    // "undefined" in the middle of a sentence on the dashboard.
    expect(describeMissingFacts([])).toBe("");
  });
});
