/**
 * The shipped example entity still produces a calendar.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * `examples/wa-small-charity.json` is the first thing a self-hoster runs, and
 * until now **nothing in this repo referenced it at all** — not a test, not a
 * script, not the README. A file that only a stranger executes is the one most
 * likely to rot, and the way it rots is silent: it stays valid JSON and stops
 * producing the answer it was written to demonstrate.
 *
 * ## The specific rot this catches
 *
 * Every fact added with **no default** — `isPrivateFoundation`, now
 * `isSupportingOrganization` — moves the whole 990 family into "cannot tell
 * yet" for any entity that does not answer it. That is the correct behaviour
 * and the entire point of having no default. It also means the example silently
 * stops showing the federal return the moment such a fact ships, and the
 * demonstration a new user gets is a calendar with a question on it instead of
 * a deadline.
 *
 * Adding the fact to the example is a one-line fix. Noticing that it was needed
 * is the hard part, and that is what this file is for.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { evaluate, type EntityFacts } from "@optima-compliance/engine";
import { ALL_RULES } from "@optima-compliance/rules";

const example = JSON.parse(
  readFileSync(join(__dirname, "..", "examples", "wa-small-charity.json"), "utf8"),
) as EntityFacts;

const result = evaluate(example, ALL_RULES, {
  asOf: "2026-09-03",
  horizonMonths: 12,
});

const federal = result.obligations.filter((o) => o.jurisdiction === "US");

describe("the shipped CLI example", () => {
  it("is an obviously fake organisation, as this public repo requires", () => {
    expect(example.name).toMatch(/^Example /);
  });

  it("produces obligations at all", () => {
    // Non-vacuity first. Every assertion below is about which rules fired, and
    // all of them would be satisfiable by an example that fired none.
    expect(result.obligations.length).toBeGreaterThan(0);
  });

  it("gets a DECIDED federal return, not a question", () => {
    // The rot this file exists for. A fact with no default is correct and it
    // silently empties this example, so the demonstration a new user gets is
    // "we need to ask you something" where a deadline should be.
    expect(federal.map((o) => o.form)).toEqual(["990-N"]);
  });

  it("leaves no federal rule undecided", () => {
    // Stronger than the assertion above and the one that actually fails when a
    // new fact ships: the example must answer EVERY question the federal rules
    // ask, not merely enough of them to reach one answer.
    expect(
      result.indeterminate.filter((r) => r.jurisdiction === "US").map((r) => r.ruleId),
    ).toEqual([]);
  });

  it("owes exactly one federal annual return", () => {
    // An organisation files one. The example is what a reader calibrates their
    // expectations against, so it showing two would teach the wrong thing
    // before any of their own data existed.
    expect(federal.length).toBe(1);
  });

  it("leaves no WASHINGTON rule undecided either", () => {
    // The same rot-guard as the federal one above, extended to the state pack
    // on 2026-09-09 because that is when it first had teeth: the two WA charity
    // rules gained four facts with no default (NEH-413), and an example that
    // did not answer them would demonstrate three "cannot tell yet" rows to
    // somebody running this repo for the first time.
    //
    // Stated as "none undecided" rather than as a list of expected rule ids, so
    // the NEXT fact with no default fails here rather than silently emptying
    // the example again.
    expect(
      result.indeterminate
        .filter((r) => r.jurisdiction === "US-WA")
        .map((r) => r.ruleId),
    ).toEqual([]);
  });

  it("still demonstrates the WA charity registration, and shows why", () => {
    // The example raises $38,000 — UNDER the RCW 19.09.081(1) exemption's
    // $50,000 line — and registers anyway, because it pays a part-time
    // coordinator and the exemption is a conjunction. That is the more
    // instructive demonstration than a charity that is simply too big, and it
    // is the reason the example's `allFundraisingUnpaid` is false rather than
    // absent.
    expect(example.contributionsRaisedMinorUnits).toBeLessThan(5_000_000);
    expect(result.obligations.map((o) => o.ruleId)).toContain(
      "us-wa-charitable-solicitation-registration",
    );
  });

  it("owes its state annual report as well", () => {
    // The example carries `nonprofit-corp` alongside `501c3` deliberately —
    // state and federal rules key off different forms — and an example that
    // demonstrated only one of the two would undersell the product and read as
    // a bug to the person running it.
    expect(
      result.obligations.some((o) => o.jurisdiction === "US-WA"),
    ).toBe(true);
  });
});
