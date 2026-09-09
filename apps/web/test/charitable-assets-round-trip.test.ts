/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * The self-host form's charitable-assets figure, all the way to a dated
 * obligation.
 *
 * ## Why this seam, and why a unit test could not have caught it
 *
 * The fact was collected by `entity-form.tsx`, converted by `parse-entity.ts`,
 * declared on `EntityFacts`, and conditioned on by
 * `us-wa-charitable-trust-registration`. Every one of those was correct on its
 * own and had tests that passed. The break was between them: `EntityStore` had
 * no column, so the fact was accepted and discarded, and the one rule that
 * depends on it reported as indeterminate forever — asking a Washington
 * charitable trust for a figure it had already typed in.
 *
 * So this walks the whole seam rather than any one part of it: the FormData a
 * browser posts, through the parser, into a real SQLite store, back out, and
 * into `evaluate` against the SHIPPED rule pack. A mock anywhere in that chain
 * would agree with the defect.
 *
 * ## The threshold, checked against the regulation rather than the rule file
 *
 * WAC 434-120-305 requires a trustee to register where they hold assets
 * "invested for income-producing purposes, exceeding a value of two hundred
 * fifty thousand dollars" — so $250,000 exactly does NOT register and
 * $250,000.01 does. The boundary cases below are that sentence, not the rule
 * JSON's restatement of it.
 *
 * ## Updated 2026-09-09: the rule now tests the phrase this file already quoted
 *
 * The quotation above was right and the rule was not. It conditioned on
 * `charitableAssetsMinorUnits` — everything held for charitable purposes —
 * while the regulation names only the part "invested for income-producing
 * purposes". A land trust holding $4M of easements was told to register.
 *
 * So this file now walks TWO seams rather than one. The broad figure must still
 * survive storage, because that is the defect this file was written for and it
 * would return the moment nobody was asserting it; and the NARROW figure must
 * now be the one that decides the rule. The pair of them is what makes the
 * distinction testable at all: an assertion that the narrow figure drives the
 * outcome is only evidence if the broad one demonstrably does not.
 */
import { evaluate } from "@optima-compliance/engine";
import { ALL_RULES } from "@optima-compliance/rules";
import { EntityStore } from "@optima-compliance/db";
import { parseEntityForm } from "../src/lib/parse-entity.js";

const RULE_ID = "us-wa-charitable-trust-registration";
const AS_OF = "2026-01-15";

/** The fields the entity form posts, as a browser would post them. */
function postedForm(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  const fields: Record<string, string> = {
    name: "Example Skagit Watershed Endowment",
    formedOn: "2009-04-02",
    homeJurisdiction: "US-WA",
    jurisdictions: "US, US-WA",
    fiscalYearEnd: "12-31",
    totalAssets: "900000",
    ...overrides,
  };
  for (const [key, value] of Object.entries(fields)) {
    if (value !== "") fd.append(key, value);
  }
  fd.append("entityTypes", "501c3");
  return fd;
}

function storeRoundTrip(fd: FormData) {
  const parsed = parseEntityForm(fd);
  if (!parsed.ok) throw new Error(`fixture does not parse: ${parsed.error}`);

  const store = new EntityStore({
    path: ":memory:",
    now: () => "2026-01-01T00:00:00.000Z",
  });
  try {
    store.create(parsed.facts, "e1");
    const read = store.get("e1");
    if (!read) throw new Error("fixture did not store");
    return { parsed: parsed.facts, read };
  } finally {
    store.close();
  }
}

describe("a charitable-assets figure entered on the self-host form", () => {
  it("is non-vacuous: the shipped pack really does carry the rule under test", () => {
    // Without this, every assertion below passes just as happily against a pack
    // that dropped the rule entirely — a green over an empty set.
    const matching = ALL_RULES.filter((rule) => rule.id === RULE_ID);
    expect(matching).toHaveLength(1);
    expect(matching[0]?.status).toBe("active");
  });

  it("reaches the parser (the half that already worked)", () => {
    const { parsed } = storeRoundTrip(postedForm({ charitableAssets: "300000" }));
    expect(parsed.charitableAssetsMinorUnits).toBe(30_000_000);
  });

  it("survives storage, which is where it used to be dropped", () => {
    const { read } = storeRoundTrip(postedForm({ charitableAssets: "300000" }));
    expect(read.charitableAssetsMinorUnits).toBe(30_000_000);
  });

  it("does not overwrite, or get overwritten by, total assets", () => {
    const { read } = storeRoundTrip(
      postedForm({ totalAssets: "900000", charitableAssets: "100000" }),
    );
    expect(read.totalAssetsMinorUnits).toBe(90_000_000);
    expect(read.charitableAssetsMinorUnits).toBe(10_000_000);
  });

  it("stores the INVESTED figure as a second, distinct number", () => {
    // Migration 8's half of the same seam. Two columns, two answers, and an
    // organisation whose charitable property is mostly in program use has a
    // much smaller invested figure than charitable one.
    const { parsed, read } = storeRoundTrip(
      postedForm({
        charitableAssets: "4150000",
        incomeProducingCharitableAssets: "310000",
      }),
    );
    expect(parsed.incomeProducingCharitableAssetsMinorUnits).toBe(31_000_000);
    expect(read.incomeProducingCharitableAssetsMinorUnits).toBe(31_000_000);
    // Neither figure has overwritten the other on the way through storage.
    expect(read.charitableAssetsMinorUnits).toBe(415_000_000);
  });

  it("does NOT decide the rule from the broad figure any more", () => {
    // The 2026-09-09 correction, as a test that fails against the old model.
    //
    // $4,150,000 of charitable assets and NOTHING invested for income: a land
    // trust holding easements and trailhead parcels. The old rule read the
    // first number, saw it sixteen times over the $250,000 line, and issued a
    // registration and a $25 fee. WAC 434-120-305 does not reach it.
    //
    // This is the one assertion in the file that decides differently under the
    // two models, which is what makes it evidence rather than decoration.
    const { read } = storeRoundTrip(
      postedForm({
        charitableAssets: "4150000",
        incomeProducingCharitableAssets: "0",
      }),
    );
    const result = evaluate(read, ALL_RULES, { asOf: AS_OF, horizonMonths: 24 });
    expect(result.obligations.map((o) => o.ruleId)).not.toContain(RULE_ID);
    // Decided, not dodged: a zero is an answer, so this must not be
    // indeterminate either.
    expect(result.indeterminate.map((r) => r.ruleId)).not.toContain(RULE_ID);
  });

  it("asks for the NARROW figure when only the broad one was given", () => {
    // The upgrade path for a self-hoster who filled this form in before
    // 2026-09-09. Their broad answer is kept and is not silently reused as the
    // narrow one, so the rule is undecided and names what it needs.
    const { read } = storeRoundTrip(postedForm({ charitableAssets: "4150000" }));
    expect(read.charitableAssetsMinorUnits).toBe(415_000_000);
    expect("incomeProducingCharitableAssetsMinorUnits" in read).toBe(false);

    const result = evaluate(read, ALL_RULES, { asOf: AS_OF, horizonMonths: 24 });
    const row = result.indeterminate.find((r) => r.ruleId === RULE_ID);
    expect(row?.missingFacts).toEqual([
      "incomeProducingCharitableAssetsMinorUnits",
    ]);
  });

  it("turns an indeterminate row into a dated obligation over the line", () => {
    // The user-visible outcome, and the thing the ticket asked for: a
    // Washington charitable trust over $250,000 gets a date instead of a
    // question about a figure it already gave.
    const { read } = storeRoundTrip(
      postedForm({ incomeProducingCharitableAssets: "300000" }),
    );
    const result = evaluate(read, ALL_RULES, { asOf: AS_OF, horizonMonths: 24 });

    expect(result.indeterminate.map((r) => r.ruleId)).not.toContain(RULE_ID);
    const due = result.obligations.filter((o) => o.ruleId === RULE_ID);
    expect(due.length).toBeGreaterThan(0);
    expect(due[0]?.dueOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("stays honestly indeterminate when the figure is left blank", () => {
    // The control. An unanswered question must still read as unanswered — a
    // storage layer that defaulted the column to 0 would make this rule decide
    // "no registration" for every organisation that never filled the field in,
    // which is the wrong-answer direction rather than the missing-answer one.
    const { read } = storeRoundTrip(postedForm());
    expect("charitableAssetsMinorUnits" in read).toBe(false);
    expect("incomeProducingCharitableAssetsMinorUnits" in read).toBe(false);

    const result = evaluate(read, ALL_RULES, { asOf: AS_OF, horizonMonths: 24 });
    expect(result.indeterminate.map((r) => r.ruleId)).toContain(RULE_ID);
    expect(
      result.indeterminate.find((r) => r.ruleId === RULE_ID)?.missingFacts,
    ).toContain("incomeProducingCharitableAssetsMinorUnits");
  });

  it.each([
    ["exactly at the line, which does not register", "250000", false],
    ["one cent over, which does", "250000.01", true],
  ] as const)("%s", (_label, dollars, expectDue) => {
    // WAC 434-120-305 says "exceeding", so the boundary belongs to the
    // organisation. Asserted here as well as in the engine's own fixtures
    // because this is the path a real self-hoster's figure travels, and a
    // cent lost to floating point on the way through storage would move it.
    const { read } = storeRoundTrip(
      postedForm({ incomeProducingCharitableAssets: dollars }),
    );
    const result = evaluate(read, ALL_RULES, { asOf: AS_OF, horizonMonths: 24 });
    const due = result.obligations.some((o) => o.ruleId === RULE_ID);
    expect(due).toBe(expectDue);
  });
});
