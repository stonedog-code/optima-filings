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

  /**
   * The supporting-organisation question, under the same discipline.
   *
   * A section 509(a)(3) supporting organisation may not file the 990-N
   * e-Postcard at any receipts level — Rev. Proc. 2011-15 sec. 3.01 relieves
   * only an organisation "other than a private foundation or a § 509(a)(3)
   * supporting organization". So reading "nobody answered" as "not a supporting
   * organisation" is the same under-filing the foundation question was added to
   * remove, one question along.
   */
  describe("the supporting-organisation question", () => {
    it("omits the fact entirely when nobody has answered", () => {
      const result = parseEntityForm(form(valid));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect("isSupportingOrganization" in result.facts).toBe(false);
    });

    it("reads an explicit yes as true", () => {
      const result = parseEntityForm(
        form({ ...valid, isSupportingOrganization: "yes" }),
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.facts.isSupportingOrganization).toBe(true);
    });

    it("reads an explicit no as false, and keeps it distinct from unanswered", () => {
      const result = parseEntityForm(
        form({ ...valid, isSupportingOrganization: "no" }),
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.facts.isSupportingOrganization).toBe(false);
      expect("isSupportingOrganization" in result.facts).toBe(true);
    });

    it("treats anything it does not recognise as unanswered, never as no", () => {
      for (const value of ["", "true", "false", "YES", "1", "maybe"]) {
        const result = parseEntityForm(
          form({ ...valid, isSupportingOrganization: value }),
        );
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect("isSupportingOrganization" in result.facts).toBe(false);
      }
    });

    it("is independent of the foundation answer", () => {
      // Two questions, two authorities, two facts. A parser that wired them to
      // one control would pass every assertion above and decide one question
      // from the other's answer.
      const result = parseEntityForm(
        form({ ...valid, isPrivateFoundation: "no", isSupportingOrganization: "yes" }),
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.facts.isPrivateFoundation).toBe(false);
      expect(result.facts.isSupportingOrganization).toBe(true);
    });
  });

  /**
   * The two prior years of gross receipts.
   *
   * They exist because "gross receipts normally $50,000 or less" is an average
   * across three taxable years (Rev. Proc. 2011-15 sec. 4), not a test on one
   * year's figure. Blank is a NORMAL answer — a new organisation has no prior
   * years — so the parser must omit rather than zero, or the average is dragged
   * down by years nobody described.
   */
  describe("the prior-year receipts", () => {
    it("omits both when neither is given", () => {
      const result = parseEntityForm(form(valid));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect("grossRevenuePriorYear1MinorUnits" in result.facts).toBe(false);
      expect("grossRevenuePriorYear2MinorUnits" in result.facts).toBe(false);
    });

    it("converts dollars to integer minor units", () => {
      const result = parseEntityForm(
        form({
          ...valid,
          grossRevenuePriorYear1: "30000.00",
          grossRevenuePriorYear2: "55000.03",
        }),
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.facts.grossRevenuePriorYear1MinorUnits).toBe(3_000_000);
      // The cent that a float round-trip loses, and the one an averaging test
      // can turn into a wrong return.
      expect(result.facts.grossRevenuePriorYear2MinorUnits).toBe(5_500_003);
    });

    it("keeps a genuine zero, which is not the same as a blank", () => {
      // An organisation really can take nothing in a year. Blank means "we were
      // not told"; zero means "nothing came in", and they average differently.
      const result = parseEntityForm(form({ ...valid, grossRevenuePriorYear1: "0" }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.facts.grossRevenuePriorYear1MinorUnits).toBe(0);
    });

    it("treats a blank as unsupplied rather than as zero", () => {
      const result = parseEntityForm(form({ ...valid, grossRevenuePriorYear1: "  " }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect("grossRevenuePriorYear1MinorUnits" in result.facts).toBe(false);
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

/**
 * The four fields added for the two Washington charity rules (NEH-413).
 *
 * Two of them are money and two are tri-state, and the tri-state pair is the
 * interesting half: unlike `solicits`, where an unticked box is honestly "no",
 * BOTH readings of an unanswered volunteer question are wrong. Read as "no",
 * the RCW 19.09.081(1) exemption is denied to every organisation that has not
 * been asked — the over-filing it exists to remove. Read as "yes", it is
 * granted to them, which is under-filing.
 */
describe("the Washington charity-exemption fields", () => {
  const parsed = (fields: Record<string, string | string[]>) => {
    const result = parseEntityForm(form({ ...valid, ...fields }));
    if (!result.ok) throw new Error(`did not parse: ${result.error}`);
    return result.facts;
  };

  it("reads contributions raised as its own figure, not as gross revenue", () => {
    // The distinction the fact exists for. A theatre with $500,000 of ticket
    // sales and $12,000 of donations has raised $12,000, and testing the wrong
    // one of these against the $50,000 line denies it the exemption.
    const facts = parsed({ grossRevenue: "500000", contributionsRaised: "12000" });
    expect(facts.grossRevenueMinorUnits).toBe(50_000_000);
    expect(facts.contributionsRaisedMinorUnits).toBe(1_200_000);
  });

  it("reads invested charitable assets as its own figure, not as charitable assets", () => {
    const facts = parsed({
      charitableAssets: "4150000",
      incomeProducingCharitableAssets: "310000",
    });
    expect(facts.charitableAssetsMinorUnits).toBe(415_000_000);
    expect(facts.incomeProducingCharitableAssetsMinorUnits).toBe(31_000_000);
  });

  it("omits an unfilled money field rather than storing zero", () => {
    // A 0 raised is BELOW the $50,000 line, so it is an answer that helps grant
    // the exemption. An absent key leaves the rule undecided and asks.
    const facts = parsed({});
    expect("contributionsRaisedMinorUnits" in facts).toBe(false);
    expect("incomeProducingCharitableAssetsMinorUnits" in facts).toBe(false);
  });

  it("keeps a real zero the user typed", () => {
    const facts = parsed({
      contributionsRaised: "0",
      incomeProducingCharitableAssets: "0",
    });
    expect(facts.contributionsRaisedMinorUnits).toBe(0);
    expect(facts.incomeProducingCharitableAssetsMinorUnits).toBe(0);
  });

  it.each([
    ["allFundraisingUnpaid", "allFundraisingUnpaid"],
    ["assetsOrIncomeInureToInsiders", "assetsOrIncomeInureToInsiders"],
  ] as const)("keeps %s as three states", (field, key) => {
    expect(parsed({ [field]: "yes" })[key]).toBe(true);
    expect(parsed({ [field]: "no" })[key]).toBe(false);
    // Unanswered must be an ABSENT KEY, not `false` — the engine tests
    // `=== undefined`, and a `false` here is a firm legal claim we have no
    // evidence for.
    expect(key in parsed({})).toBe(false);
    expect(key in parsed({ [field]: "" })).toBe(false);
  });
});
