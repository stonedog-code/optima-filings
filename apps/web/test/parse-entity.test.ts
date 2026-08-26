/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import {
  dollarsToMinorUnits,
  parseEntityForm,
  parseTriState,
} from "../src/lib/parse-entity.js";

function form(fields: Record<string, string | string[]>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const v of Array.isArray(value) ? value : [value]) fd.append(key, v);
  }
  return fd;
}

const valid = {
  name: "Example Cascade Trails Association",
  entityTypes: ["501c3", "nonprofit-corp"],
  formedOn: "2021-03-15",
  homeJurisdiction: "US-WA",
  jurisdictions: "US, US-WA",
  fiscalYearEnd: "12-31",
};

describe("dollarsToMinorUnits", () => {
  it.each([
    ["42000", 4_200_000],
    ["1234.56", 123456],
    ["0.05", 5],
    ["0", 0],
  ])("converts %s dollars to %d minor units", (input, expected) => {
    expect(dollarsToMinorUnits(input)).toBe(expected);
  });

  it("does not lose a cent to floating point", () => {
    // parseFloat("1234.56") * 100 is 123455.99999999999. Truncating that loses
    // a cent; this is the one place a human-entered decimal crosses into the
    // integer-minor-units convention the rest of the codebase relies on.
    for (const dollars of ["1234.56", "0.29", "19.99", "8.07", "100.10"]) {
      const minor = dollarsToMinorUnits(dollars)!;
      expect(Number.isInteger(minor)).toBe(true);
      expect(minor).toBe(Math.round(Number(dollars) * 100));
    }
  });

  it("treats blank as unknown, not as zero", () => {
    expect(dollarsToMinorUnits("")).toBeUndefined();
    expect(dollarsToMinorUnits("   ")).toBeUndefined();
  });

  it("rejects nonsense and negatives rather than coercing them", () => {
    expect(dollarsToMinorUnits("abc")).toBeUndefined();
    expect(dollarsToMinorUnits("-5")).toBeUndefined();
  });
});

describe("parseEntityForm", () => {
  it("accepts a complete form", () => {
    const result = parseEntityForm(form(valid));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.facts).toMatchObject({
      name: valid.name,
      entityTypes: ["501c3", "nonprofit-corp"],
      formedOn: "2021-03-15",
      fiscalYearEnd: "12-31",
    });
  });

  it.each([
    [{ name: "" }, /Name is required/],
    [{ entityTypes: [] }, /at least one legal form/],
    [{ formedOn: "15-03-2021" }, /real date/],
    [{ homeJurisdiction: "Washington" }, /not a recognised code/],
    [{ jurisdictions: "US, Cascadia" }, /not a recognised jurisdiction/],
    [{ fiscalYearEnd: "December" }, /MM-DD/],
    [{ fiscalYearEnd: "13-01" }, /not a real month/],
  ])("rejects %o", (override, message) => {
    const result = parseEntityForm(form({ ...valid, ...override }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(message);
  });

  it("adds the home jurisdiction if the user left it out of the list", () => {
    // A rule only applies if its jurisdiction is listed, so omitting the home
    // state would silently drop every state filing — a false negative from a
    // typo. Adding it is what the user meant.
    const result = parseEntityForm(form({ ...valid, jurisdictions: "US" }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.facts.jurisdictions).toContain("US-WA");
  });

  it("uppercases jurisdiction codes so us-wa works", () => {
    const result = parseEntityForm(
      form({ ...valid, homeJurisdiction: "us-wa", jurisdictions: "us, us-wa" }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.facts.homeJurisdiction).toBe("US-WA");
  });

  it("omits an unfilled money field rather than storing zero", () => {
    const result = parseEntityForm(form(valid));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.facts).not.toHaveProperty("grossRevenueMinorUnits");
  });

  it("keeps a real zero the user typed", () => {
    const result = parseEntityForm(form({ ...valid, grossRevenue: "0" }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.facts.grossRevenueMinorUnits).toBe(0);
  });

  it("reads an unticked solicits box as false, not unknown", () => {
    // The checkbox is always in the submission, so absence means "no" here —
    // unlike the money fields, where absence genuinely means "not supplied".
    const result = parseEntityForm(form(valid));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.facts.solicitsCharitableContributions).toBe(false);
  });

  it("reads a ticked solicits box as true", () => {
    const result = parseEntityForm(form({ ...valid, solicits: "true" }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.facts.solicitsCharitableContributions).toBe(true);
  });

  it("drops an entity type the engine does not know", () => {
    const result = parseEntityForm(
      form({ ...valid, entityTypes: ["501c3", "sole-trader"] }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.facts.entityTypes).toEqual(["501c3"]);
  });

  /**
   * The private-foundation question — NEH-1146.
   *
   * Three states, and the third is the one that has to survive the form. A
   * private foundation may never file Form 990-N at any receipts level, so
   * reading "nobody answered" as "not a foundation" is how the engine came to
   * name that return for one. These assert the boundary where a form post
   * becomes a fact, which is the layer a checkbox would have quietly collapsed.
   */
  describe("the private-foundation question", () => {
    it("omits the fact entirely when nobody has answered", () => {
      // Absent, not `false` and not `undefined` under a present key. The engine
      // treats an absent fact as unknown and reports the 990 family as
      // indeterminate; a `false` here decides it, wrongly, for every entity.
      const result = parseEntityForm(form(valid));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect("isPrivateFoundation" in result.facts).toBe(false);
    });

    it("reads an explicit yes as true", () => {
      const result = parseEntityForm(form({ ...valid, isPrivateFoundation: "yes" }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.facts.isPrivateFoundation).toBe(true);
    });

    it("reads an explicit no as false, and keeps it distinct from unanswered", () => {
      // "No" is a real answer that decides the family, and it must not be
      // laundered back into "we never asked" — that would put the rule into
      // indeterminate every time the customer edited an unrelated field.
      const result = parseEntityForm(form({ ...valid, isPrivateFoundation: "no" }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.facts.isPrivateFoundation).toBe(false);
      expect("isPrivateFoundation" in result.facts).toBe(true);
    });

    it("treats the empty selection as unanswered", () => {
      // What the "I do not know yet" option actually posts.
      const result = parseEntityForm(form({ ...valid, isPrivateFoundation: "" }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect("isPrivateFoundation" in result.facts).toBe(false);
    });

    it("treats anything it does not recognise as unanswered, never as no", () => {
      // A hand-rolled POST, a renamed option, a stale cached page. The unsafe
      // reading of an unknown value is "not a foundation"; the safe one is
      // "we still need to ask".
      for (const value of ["true", "false", "YES", "1", "maybe"]) {
        const result = parseEntityForm(form({ ...valid, isPrivateFoundation: value }));
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect("isPrivateFoundation" in result.facts).toBe(false);
      }
    });
  });
});

describe("parseTriState", () => {
  it.each([
    ["yes", true],
    ["no", false],
  ] as const)("maps %s to %s", (input, expected) => {
    expect(parseTriState(input)).toBe(expected);
  });

  it.each(["", "   ", "unknown", "true", "0", "Yes"])(
    "maps %p to undefined rather than to a decision",
    (input) => {
      expect(parseTriState(input)).toBeUndefined();
    },
  );
});
