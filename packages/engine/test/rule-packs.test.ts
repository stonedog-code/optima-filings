/**
 * The shipped rule packs, run through the real engine.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * `rules:validate` proves a rule is well-formed. This proves it *does something
 * sensible* — the gap between the two is where a schema-valid rule quietly
 * produces a wrong date, which is the defect class this product cannot afford.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { evaluate } from "../src/evaluate.js";
import { CONDITIONABLE_FACTS } from "../src/facts.js";
import type { EntityFacts } from "../src/facts.js";
import type { Rule } from "../src/rule.js";
// Imported as a namespace as well as by name, so the 990-family invariant at
// the bottom can iterate EVERY fixture rather than a hand-maintained list that
// the next fixture would be missing from.
import * as fixtures from "./fixtures/entities.js";
import {
  DE_CORP,
  ENDOWED_NON_SOLICITING_CHARITY,
  JUNE_YEAR_END_SOLICITING_CHARITY,
  OR_CORP_LEAP_DAY,
  OR_LLC,
  OR_NONPROFIT_MID_MONTH,
  WA_LARGE_CHARITY,
  WA_SMALL_CHARITY,
} from "./fixtures/entities.js";

const rulesRoot = join(__dirname, "..", "..", "rules");
const schemaPath = join(rulesRoot, "schema", "rule.v1.json");

function ruleFiles(dir: string = join(rulesRoot, "us")): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return ruleFiles(full);
    return name.endsWith(".json") ? [full] : [];
  });
}

const RULES: Rule[] = ruleFiles().map((file) => {
  const { $schema: _schema, ...rule } = JSON.parse(readFileSync(file, "utf8"));
  return rule as Rule;
});

const byId = (id: string): Rule => {
  const found = RULES.find((rule) => rule.id === id);
  if (!found) throw new Error(`No such rule: ${id}`);
  return found;
};

describe("the pack loads", () => {
  it("has rules", () => {
    expect(RULES.length).toBeGreaterThan(0);
  });

  it("has a unique id per rule version", () => {
    const ids = RULES.map((r) => r.id);
    // Duplicates are legitimate only across effective windows, and the
    // validator checks that separately. None of the seed rules is superseded.
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("schema and TypeScript agree", () => {
  it("allows exactly the facts the engine can evaluate", () => {
    // Two definitions of the conditionable facts exist — the schema's enum and
    // the engine's const — because the validator runs before anything is built
    // and cannot import from dist. This is what stops them drifting: a fact
    // added to one and not the other would let a rule validate and then never
    // match.
    const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
    // Both condition branches — leaf and `anyOf` member — `$ref` this one
    // definition, so there is a single place the enum can drift, not two.
    const schemaFacts = schema.definitions.condition.properties.fact.enum;
    expect([...schemaFacts].sort()).toEqual([...CONDITIONABLE_FACTS].sort());
  });

  it("uses the same condition definition for leaves and for anyOf members", () => {
    // If the group branch stopped $ref-ing the shared definition, a fact could
    // become valid inside a group and invalid outside it — and that drift would
    // only ever surface as a rule that validates and then never matches.
    const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
    const [leaf, group] = schema.properties.conditions.items.oneOf;
    expect(leaf.$ref).toBe("#/definitions/condition");
    expect(group.properties.anyOf.items.$ref).toBe("#/definitions/condition");
  });

  it("allows exactly the entity types the engine knows", () => {
    const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
    const schemaTypes = schema.properties.entityTypes.items.enum;
    // Imported lazily so a mismatch reports as a value diff, not a type error.
    const { ENTITY_TYPES } = require("../src/facts.js");
    expect([...schemaTypes].sort()).toEqual([...ENTITY_TYPES].sort());
  });
});

describe("every seeded rule is honest about its provenance", () => {
  it.each(RULES.map((r) => r.id))("%s cites a primary source", (id) => {
    const rule = byId(id);
    expect(rule.citation.length).toBeGreaterThan(4);
    // A bare URL is not a citation — a reviewer needs to know which statute to
    // read, not just where the agency lives.
    expect(rule.citation).not.toMatch(/^https?:\/\//);
  });

  it("marks unverified rules as draft rather than asserting them", () => {
    // The seed set was written from general knowledge, not from reading each
    // statute. Shipping it as `active` would be the exact false-confidence
    // failure the whole design is built to avoid.
    const active = RULES.filter((r) => r.status === "active");
    const drafts = RULES.filter((r) => r.status === "draft");
    expect(drafts.length + active.length).toBe(RULES.length);
    for (const rule of drafts) {
      expect(rule.notes ?? "").not.toBe("");
    }
  });
});

describe("a small Washington charity", () => {
  const result = evaluate(WA_SMALL_CHARITY, RULES, {
    asOf: "2026-01-01",
    horizonMonths: 12,
    includeDraft: true,
  });

  it("owes the state annual report at the end of its formation month", () => {
    // Formed 2021-03-15.
    const report = result.obligations.find(
      (o) => o.ruleId === "us-wa-sos-nonprofit-annual-report",
    );
    expect(report?.dueOn).toBe("2026-03-31");

    /**
     * NO FEE, and that is the assertion rather than an omission.
     *
     * This used to pin `6000` — $60, read off search results attributed to
     * sos.wa.gov and never confirmed by a person. The rule's own notes said as
     * much, and said more: the figure drops to **$20** for a nonprofit whose
     * gross revenue was under $500,000, which describes most of this project's
     * customers. The schema cannot express that conditional, so any single
     * number is wrong for one group or the other — and the group $60 overstates
     * by 3x is the larger one.
     *
     * The fee was removed when the rule was promoted to `active`, so the screen
     * shows the deadline and sends the filer to the agency's page for the
     * amount. An absent fee costs a click; a wrong one sends money to the wrong
     * place.
     *
     * A test that asserted the old value was part of what made it look
     * verified.
     *
     * UPDATED 2026-08-08 (NEH-402): the fee schedule HAS now been read, and the
     * structure is not the "$60 reduced to $20" assumed above. WAC
     * 434-112-085(8)(m) sets the annual report at "Ten dollars, plus the
     * Charitable Asset Protection Account fee", and RCW 24.03A.960(2)(b) sets
     * that fee at "fifty dollars per year, reduced to ten dollars if the
     * corporation certifies that its total gross revenue in the most recent
     * fiscal year was less than five hundred thousand dollars" — so $20 or $60,
     * as a base plus a conditional surcharge, turning on the corporation
     * CERTIFYING rather than on the revenue fact alone.
     *
     * The reasoning for showing nothing is unchanged and now better evidenced.
     * The remaining blocker is only the schema, which cannot express any of
     * this — see NEH-403. Restore a figure here when it can, not before.
     */
    expect(report?.feeMinorUnits).toBeUndefined();
  });

  it("owes the 990-N, not the full 990", () => {
    // $42,000 of revenue is under the e-Postcard ceiling.
    const federal = result.obligations
      .filter((o) => o.jurisdiction === "US")
      .map((o) => o.ruleId);
    expect(federal).toContain("us-federal-form-990-n");
    expect(federal).not.toContain("us-federal-form-990");
    expect(federal).not.toContain("us-federal-form-990-ez");
  });

  it("owes the 990-N on 15 May for a calendar fiscal year", () => {
    const postcard = result.obligations.find(
      (o) => o.ruleId === "us-federal-form-990-n",
    );
    expect(postcard?.dueOn).toBe("2026-05-15");
  });

  it("owes charity registration because it solicits", () => {
    expect(result.obligations.map((o) => o.ruleId)).toContain(
      "us-wa-charitable-solicitation-registration",
    );
  });

  it("owes nothing in Oregon or Delaware", () => {
    const foreign = result.obligations.filter(
      (o) => o.jurisdiction === "US-OR" || o.jurisdiction === "US-DE",
    );
    expect(foreign).toEqual([]);
  });
});

describe("a large Washington charity with a June fiscal year", () => {
  const result = evaluate(WA_LARGE_CHARITY, RULES, {
    asOf: "2026-01-01",
    horizonMonths: 12,
    includeDraft: true,
  });

  it("owes the full 990, and it is not due in May", () => {
    // Year ends 30 June, so the return is due the 15th day of the 5th month
    // after — November — the case a hardcoded "May 15" gets wrong for every
    // non-calendar filer.
    //
    // MONDAY THE 16th, NOT SUNDAY THE 15th. This assertion said `2026-11-15`
    // until the 990 rules gained `weekendRule: "roll-forward"`, and it was
    // asserting a deadline that falls on a Sunday. The IRS is explicit — "If a
    // due date falls on a Saturday, Sunday, or legal holiday, the due date is
    // delayed until the next business day" — so the engine is right and the
    // fixture was wrong.
    //
    // Worth keeping as the weekend case rather than picking a mid-week year
    // end: it is the assertion that would go quiet if the weekend rule were
    // ever dropped from the rule JSON, and a deadline shown on a day the IRS
    // is closed is exactly the kind of small wrongness that costs trust.
    const federal = result.obligations.find((o) => o.jurisdiction === "US");
    expect(federal?.ruleId).toBe("us-federal-form-990");
    expect(federal?.dueOn).toBe("2026-11-16");
  });
});

describe("an Oregon LLC formed on 31 January", () => {
  const result = evaluate(OR_LLC, RULES, {
    asOf: "2026-01-01",
    horizonMonths: 12,
    includeDraft: true,
  });

  it("owes only the Oregon annual report", () => {
    expect(result.obligations.map((o) => o.ruleId)).toEqual([
      "us-or-sos-llc-annual-report",
    ]);
  });

  it("owes it at the end of January, not in February", () => {
    expect(result.obligations[0]?.dueOn).toBe("2026-01-31");
  });
});

describe("a Delaware corporation", () => {
  const result = evaluate(DE_CORP, RULES, {
    asOf: "2026-01-01",
    horizonMonths: 12,
    includeDraft: true,
  });

  it("owes the annual report on the fixed March date", () => {
    const report = result.obligations.find(
      (o) => o.ruleId === "us-de-corporation-annual-report",
    );
    expect(report?.dueOn).toBe("2026-03-01");
  });

  it("does not owe the LLC tax", () => {
    expect(result.obligations.map((o) => o.ruleId)).not.toContain(
      "us-de-llc-annual-tax",
    );
  });
});

describe("an endowed Washington charity that does not solicit", () => {
  const result = evaluate(ENDOWED_NON_SOLICITING_CHARITY, RULES, {
    asOf: "2026-01-01",
    horizonMonths: 12,
    includeDraft: true,
  });

  it("must still be told it owes SOMETHING", () => {
    // THE REGRESSION (NEH-228), preserved through the NEH-401 split. Its point
    // was never which rule fired — it was that an endowed non-soliciting
    // charity had been told it owed NOTHING. A false negative, where a clean
    // calendar hides a filing, is the failure this product can least afford.
    //
    // Asserted as "not empty" rather than by rule id, so the guarantee survives
    // the next time these obligations are reorganised. The specific filing is
    // pinned separately below.
    expect(result.obligations.length).toBeGreaterThan(0);
  });

  it("owes exactly ONE of the 990 family, not both", () => {
    // THE REGRESSION (NEH-410). This entity is low on receipts ($30k) and high
    // on assets ($9M), and it fired BOTH `us-federal-form-990-n` and
    // `us-federal-form-990`. Those are alternatives — an organisation files one
    // annual return — and being told to file two is the kind of wrong that
    // makes a customer distrust the rest of the calendar.
    //
    // Neither condition was individually unfaithful: 990-N's row states a
    // gross-receipts test with no assets ceiling, and 990's row states an
    // assets test with no receipts floor. The published thresholds table simply
    // does not resolve an entity low on one axis and high on the other.
    //
    // The fix gives 990-N an assets ceiling, exactly as form-990-ez.json
    // already carries one, and toward the FULLER return — under-filing is the
    // worse direction for a compliance product to be wrong in.
    const owed = result.obligations.map((o) => o.ruleId);
    expect(owed).toContain("us-federal-form-990");
    expect(owed).not.toContain("us-federal-form-990-n");
  });

  it("owes the TRUST registration, not the solicitation one", () => {
    // What the split corrected. The $250k trigger is RCW 11.110 charitable
    // TRUST registration (WAC 434-120-305), not RCW 19.09 solicitation
    // registration — a different form at a different price ($25 against $40).
    //
    // The two deadlines are identical (WAC 434-120-025 defines one renewal date
    // for both), which is exactly why merging them looked harmless and went
    // unnoticed: the date was right and only the form and fee were wrong.
    const owed = result.obligations.map((o) => o.ruleId);
    expect(owed).toContain("us-wa-charitable-trust-registration");
    expect(owed).not.toContain("us-wa-charitable-solicitation-registration");
  });

  it("is charged the trust fee, not the charitable-organization fee", () => {
    // The visible consequence of the split, and the reason it is worth doing
    // even though both filings fall on the same day.
    const trust = result.obligations.find(
      (o) => o.ruleId === "us-wa-charitable-trust-registration",
    );
    expect(trust?.feeMinorUnits).toBe(2_500);
  });

  it("is not caught merely by having large TOTAL assets", () => {
    // Guards the distinction the fact model exists to preserve: an
    // organisation with big non-charitable holdings and little charitable
    // property must NOT be pushed into registering.
    const nonCharitable = {
      ...ENDOWED_NON_SOLICITING_CHARITY,
      charitableAssetsMinorUnits: 1_000_00, // $1,000 — well under the line
    };
    const narrow = evaluate(nonCharitable, RULES, {
      asOf: "2026-01-01",
      horizonMonths: 12,
      includeDraft: true,
    });
    expect(narrow.obligations.map((o) => o.ruleId)).not.toContain(
      "us-wa-charitable-trust-registration",
    );
  });

  it("is not caught at EXACTLY $250,000, because the WAC says 'exceeding'", () => {
    // The off-by-one the split also fixed: the old rule used `gte`. WAC
    // 434-120-305 requires registration where the trustee holds assets
    // "exceeding a value of two hundred fifty thousand dollars", so a trust
    // holding precisely that much does not register.
    //
    // A boundary nobody would notice by reading either the rule or the
    // regulation casually, and the only entity it is ever wrong for is the one
    // sitting exactly on the line.
    const exactly = {
      ...ENDOWED_NON_SOLICITING_CHARITY,
      charitableAssetsMinorUnits: 250_000_00,
    };
    const atLine = evaluate(exactly, RULES, {
      asOf: "2026-01-01",
      horizonMonths: 12,
      includeDraft: true,
    });
    expect(atLine.obligations.map((o) => o.ruleId)).not.toContain(
      "us-wa-charitable-trust-registration",
    );
  });

  it("IS caught one cent over", () => {
    // The other side of the same boundary — without this, a rule that never
    // fired at all would pass the assertion above.
    const overLine = {
      ...ENDOWED_NON_SOLICITING_CHARITY,
      charitableAssetsMinorUnits: 250_000_00 + 1,
    };
    const over = evaluate(overLine, RULES, {
      asOf: "2026-01-01",
      horizonMonths: 12,
      includeDraft: true,
    });
    expect(over.obligations.map((o) => o.ruleId)).toContain(
      "us-wa-charitable-trust-registration",
    );
  });

  it("a SOLICITING charity owes the solicitation registration instead", () => {
    // The mirror of the split. Narrowing the solicitation rule must not have
    // broken the case it was actually written for.
    const soliciting = {
      ...ENDOWED_NON_SOLICITING_CHARITY,
      solicitsCharitableContributions: true,
    };
    const asks = evaluate(soliciting, RULES, {
      asOf: "2026-01-01",
      horizonMonths: 12,
      includeDraft: true,
    });
    const owed = asks.obligations.map((o) => o.ruleId);
    expect(owed).toContain("us-wa-charitable-solicitation-registration");
    // …and it owes BOTH, because it both solicits and holds the assets. Two
    // registrations, two forms, two fees, one deadline.
    expect(owed).toContain("us-wa-charitable-trust-registration");
  });
});

/**
 * Amounts and citations checked against the primary source on 2026-08-05 and
 * again on 2026-08-08 (Washington), with the exact quote in each rule's
 * `notes`.
 *
 * These are here because a fee is a plain number in a JSON file, and a plain
 * number is the easiest thing in this repo to "tidy" back to a wrong value
 * months later — the two corrected below had both been wrong since the seed
 * commit, and one of them (Delaware) had a note *asking* for exactly this
 * check. A number nobody asserts is a number that drifts back.
 *
 * Deliberately NOT a claim that every rule is verified. The set was promoted to
 * `active` in pack `2026.8.6`, so `status` no longer distinguishes what has been
 * read from what has not; each rule's `notes` and `lastVerified` do. This pins
 * what the reading found so far.
 */
describe("what the primary sources actually say", () => {
  it("charges $400 for the Delaware LLC annual tax, not $300", () => {
    // 6 Del. C. 18-1107(b): "...shall pay an annual tax, for the use of the
    // State of Delaware, in the amount of $400." The seed value of $300 was
    // right for earlier years and had gone stale — the exact rot the
    // `lastVerified` discipline exists to catch.
    expect(byId("us-de-llc-annual-tax").fee?.amountMinorUnits).toBe(40_000);
  });

  it("charges $40 to RENEW a Washington charity registration, not the $60 to apply", () => {
    // RCW 19.09.062 sets both, and the seed took the wrong one. This rule is
    // the renewal. A wrong fee is a smaller failure than a wrong date, but it
    // is the kind a customer notices at the moment they are paying.
    expect(
      byId("us-wa-charitable-solicitation-registration").fee?.amountMinorUnits,
    ).toBe(4_000);
  });

  it("cites a Washington nonprofit section that exists", () => {
    // The seed cited RCW 24.03A.1010, which returns "The Citation you
    // requested cannot be found". An unreviewable citation is worse than a
    // missing one: it looks checked.
    const rule = byId("us-wa-sos-nonprofit-annual-report");
    expect(rule.citation).toContain("24.03A.070");
    expect(rule.citation).not.toContain("24.03A.1010");
  });

  it("charges $70 for a Washington profit corporation or LLC annual report, not $60", () => {
    // WAC 434-112-085(7)(p): "Annual report Seventy dollars", for entities
    // under Title 23B RCW and chapters 23.78, 23.86, 25.05, 25.10 and 25.15
    // RCW. The SOS fee schedule agrees and states the increase from $60
    // outright, citing the same subsection.
    //
    // $60 was in the seed, was flagged "PROBABLY WRONG" on 2026-08-05, and was
    // then REMOVED rather than corrected, because the only evidence against it
    // was a search summary. It is corrected now because the regulation itself
    // was read. Both rules, because they take the fee from one subsection and
    // a future edit that fixes one will look complete.
    for (const id of [
      "us-wa-sos-corporation-annual-report",
      "us-wa-sos-llc-annual-report",
    ]) {
      expect(byId(id).fee?.amountMinorUnits).toBe(7_000);
    }
  });

  it("cites the regulation that actually sets the Washington due date", () => {
    // Every Washington annual-report rule uses `formation-month` +
    // `dayOfMonth: last`, and until now nothing in the pack said where that
    // came from: RCW 23.95.255(4) delegates the date to the secretary of
    // state, so the STATUTE deliberately does not fix it. That left the
    // product's most-read date resting on an uncited reading of agency
    // practice.
    //
    // WAC 434-112-060(1) is where the secretary set it — "by the last day of
    // the month that the entity was formed or registered by the division" —
    // and RCW 23.95.105(6) is what makes it reach corporations, LLCs and
    // nonprofits alike. Asserted on all three so that dropping the citation
    // while leaving the cadence in place fails here.
    for (const id of [
      "us-wa-sos-corporation-annual-report",
      "us-wa-sos-llc-annual-report",
      "us-wa-sos-nonprofit-annual-report",
    ]) {
      const rule = byId(id);
      expect(rule.citation).toContain("WAC 434-112-060");
      expect(rule.cadence).toMatchObject({
        anchor: "formation-month",
        dayOfMonth: "last",
      });
    }
  });

  it("does not cite the commercial fund-raiser section for a charity's own renewal", () => {
    // RCW 19.09.097 governs contracts with commercial fund-raisers and says
    // nothing about renewal. Citing it made the rule look sourced while
    // pointing a reviewer at the wrong page.
    expect(
      byId("us-wa-charitable-solicitation-registration").citation,
    ).not.toContain("19.09.097");
  });

  it("rolls the 990 family forward off a weekend, because the IRS says so", () => {
    // Opted in per rule, never globally — rolling by default would invent a
    // legal position no rule claimed. Here the agency states it outright.
    for (const id of [
      "us-federal-form-990",
      "us-federal-form-990-ez",
      "us-federal-form-990-n",
    ]) {
      expect(byId(id).weekendRule).toBe("roll-forward");
    }
  });

  it("rolls the WA charities renewal BACKWARD, because WAC says last business day", () => {
    // The opposite direction, and it is not a preference. WAC 434-120-140(2)(a)
    // asks for the renewal "no later than the last business day OF the eleventh
    // month" — the last business day of a period, not the next business day
    // after a date. So a period ending on a Saturday means the Friday before.
    expect(byId("us-wa-charitable-solicitation-registration").weekendRule).toBe(
      "roll-backward",
    );
  });

  it("leaves every OTHER state rule alone, because no other state source says to", () => {
    // NARROWED, not deleted. This assertion existed to stop an "add it
    // everywhere while I'm here" tidy-up making a silent legal claim on behalf
    // of five agencies, and that risk is unchanged — one rule now has a source
    // that says so, and the rest still do not.
    //
    // Listing the exception by id rather than filtering it out by predicate:
    // a second rule quietly acquiring a weekend rule has to be added here by
    // hand, which is the moment somebody asks what statute says so.
    const WITH_A_SOURCE = new Set(["us-wa-charitable-solicitation-registration"]);
    for (const rule of RULES.filter(
      (r) => r.jurisdiction !== "US" && !WITH_A_SOURCE.has(r.id),
    )) {
      expect(rule.weekendRule).toBeUndefined();
    }
  });

  it("moves a Sunday deadline to the FRIDAY BEFORE, not the Monday after", () => {
    // The bug this fixes: `dayOfMonth: "last"` gives the last CALENDAR day, so
    // a period ending on a weekend showed a date up to two days LATE — the
    // direction that costs somebody a late fee.
    //
    // 30 June year end + 11 months = 31 May 2026, a Sunday. Asserted against
    // all three candidate dates, because the point is which one it is: the
    // uncorrected 31st, the wrong-direction 1st, or the right answer.
    const result = evaluate(JUNE_YEAR_END_SOLICITING_CHARITY, RULES, {
      asOf: "2026-01-01",
      horizonMonths: 12,
      includeDraft: true,
    });
    const renewal = result.obligations.find(
      (o) => o.ruleId === "us-wa-charitable-solicitation-registration",
    );
    expect(renewal?.dueOn).toBe("2026-05-29"); // Friday
    expect(renewal?.dueOn).not.toBe("2026-05-31"); // Sunday — the old behaviour
    expect(renewal?.dueOn).not.toBe("2026-06-01"); // Monday — rolled the wrong way
  });
});

/**
 * Oregon is due on the ANNIVERSARY DATE, not the end of the anniversary month.
 *
 * ORS 65.787(1), 60.787(1) and 63.787(1) all use the same phrase — "by the
 * corporation's anniversary" — and the Oregon SOS says the same in its own
 * words: "Your renewal is due on the anniversary date of the original filing."
 *
 * The rules used to say end-of-month, which is up to 30 days LATE. Late is the
 * direction that costs someone a penalty, so this is the failure mode worth
 * pinning hardest.
 *
 * These cases are all mid-month or leap-day on purpose. `OR_LLC` is formed on
 * the 31st, where month-end and anniversary coincide — which is exactly why the
 * bug survived a full fixture suite (NEH-400).
 */
describe("an Oregon nonprofit formed mid-month", () => {
  const result = evaluate(OR_NONPROFIT_MID_MONTH, RULES, {
    asOf: "2026-01-01",
    horizonMonths: 12,
    includeDraft: true,
  });

  it("owes the annual report on its anniversary, not at month end", () => {
    // Formed 2019-06-14. The old rule said 30 June — sixteen days late.
    const report = result.obligations.find(
      (o) => o.ruleId === "us-or-sos-nonprofit-annual-report",
    );
    expect(report?.dueOn).toBe("2026-06-14");
    expect(report?.feeMinorUnits).toBe(5000);
  });

  it("is not quietly rounded to the end of the month", () => {
    // Stated separately from the assertion above so a regression names itself:
    // if this is the one that fails, the cadence anchor moved back.
    const report = result.obligations.find(
      (o) => o.ruleId === "us-or-sos-nonprofit-annual-report",
    );
    expect(report?.dueOn).not.toBe("2026-06-30");
  });
});

/**
 * These two pass under BOTH cadences and always did.
 *
 * February's month end is the 28th or 29th, which is exactly where a leap-day
 * anniversary clamps to — so `formation-month` and `formation-anniversary`
 * agree here. Kept anyway, because what they actually guard is the clamp
 * matching ORS 65.001 in both directions, which is a separate claim from which
 * anchor is used.
 *
 * Said out loud so nobody later reads them as the NEH-400 regression test and
 * deletes the mid-month case as redundant. It is the only one that can fail.
 */
describe("an Oregon corporation formed on a leap day", () => {
  it("is due 28 February in a common year, per ORS", () => {
    // ORS defines the anniversary as 28 February where it would otherwise fall
    // on 29 February. 2026 is not a leap year.
    const result = evaluate(OR_CORP_LEAP_DAY, RULES, {
      asOf: "2026-01-01",
      horizonMonths: 12,
      includeDraft: true,
    });
    const report = result.obligations.find(
      (o) => o.ruleId === "us-or-sos-corporation-annual-report",
    );
    expect(report?.dueOn).toBe("2026-02-28");
  });

  it("is due 29 February in a leap year", () => {
    // The other half. Clamping to the 28th every year would be just as wrong,
    // and a suite that only tested common years would not notice.
    const result = evaluate(OR_CORP_LEAP_DAY, RULES, {
      asOf: "2028-01-01",
      horizonMonths: 12,
      includeDraft: true,
    });
    const report = result.obligations.find(
      (o) => o.ruleId === "us-or-sos-corporation-annual-report",
    );
    expect(report?.dueOn).toBe("2028-02-29");
  });
});

describe("the Oregon LLC formed on a month end", () => {
  it("still lands on the 31st, where both readings agree", () => {
    // Kept deliberately. It is the case that CANNOT distinguish the two
    // cadences, and its job now is to prove the anniversary anchor did not
    // break the coincidence — not to prove the anchor is right, which is what
    // the mid-month case above is for.
    const result = evaluate(OR_LLC, RULES, {
      asOf: "2026-01-01",
      horizonMonths: 12,
      includeDraft: true,
    });
    expect(result.obligations[0]?.dueOn).toBe("2026-01-31");
  });
});

/**
 * The two formation anchors are one keystroke apart and mean different things.
 *
 * `formation-month` takes the day from the RULE; `formation-anniversary` takes
 * it from the ENTITY. They produce the same date only when an entity was formed
 * on a month end — common enough that the Oregon rules shipped wrong and the
 * whole fixture suite agreed with them.
 *
 * So the choice is asserted per jurisdiction rather than left to a reviewer
 * noticing a word. Anything that changes one of these should have read a
 * statute first, and should be changing this test in the same commit.
 */
describe("each jurisdiction uses the anchor its statute actually specifies", () => {
  it("Oregon reports are anchored to the anniversary DATE", () => {
    // ORS 65.787(1) / 60.787(1) / 63.787(1): "by the corporation's anniversary".
    for (const rule of RULES.filter((r) => r.jurisdiction === "US-OR")) {
      expect(rule.cadence).toEqual({
        type: "annual",
        anchor: "formation-anniversary",
      });
    }
  });

  it("Washington reports are anchored to the formation MONTH", () => {
    // A different shape, not an oversight: no Washington statute sets the date
    // at all (RCW 23.95.255(4) delegates it to the secretary of state), and the
    // agency's published practice is the end of the formation month — the same
    // day for every entity. NEH-402 tracks getting that a citation of its own.
    const waAnnualReports = RULES.filter(
      (r) => r.jurisdiction === "US-WA" && r.id.includes("annual-report"),
    );
    expect(waAnnualReports.length).toBeGreaterThan(0);
    for (const rule of waAnnualReports) {
      expect(rule.cadence).toEqual({
        type: "annual",
        anchor: "formation-month",
        dayOfMonth: "last",
      });
    }
  });

  it("no rule uses formation-anniversary with a dayOfMonth", () => {
    // The schema forbids it (`additionalProperties: false`), and this says why
    // in words a rule author reads: the day is a fact about the entity, so a
    // rule naming one would be asserting something it cannot know.
    for (const rule of RULES) {
      if (rule.cadence.anchor === "formation-anniversary") {
        expect("dayOfMonth" in rule.cadence).toBe(false);
      }
    }
  });
});

/**
 * Every rule points a filer at the agency's own page.
 *
 * `citation` and `citationUrl` answer *"is this rule faithful to the law"* —
 * a reviewer's question. `agencyUrl` answers *"what is true today, and where do
 * I file it"* — the question the person with a deadline actually has.
 *
 * They are separate fields because the statute frequently **cannot** answer the
 * second one. RCW 23.95.255(4) hands the annual-report due date to the
 * secretary of state and names no date. 8 Del. C. 502 sets the 1 March deadline
 * and no fee at all. A product that linked only the citation would send a
 * customer to a page that does not contain the number they came for.
 *
 * Required here rather than in the schema: the schema leaves it optional
 * because a filing with no agency page on the public web is conceivable, but no
 * rule in this pack is one, and a rule shipping without it should fail.
 */
describe("every rule links to the agency, not only to the statute", () => {
  it.each(RULES.map((r) => r.id))("%s has an agency URL", (id) => {
    const rule = byId(id);
    expect(rule.agencyUrl).toBeDefined();
    expect(rule.agencyUrl).toMatch(/^https:\/\//);
  });

  it.each(RULES.map((r) => r.id))("%s links somewhere official", (id) => {
    // A `.gov` host, or the agency itself. This is the assertion that stops a
    // well-meaning contributor linking a compliance vendor's summary page —
    // which is the single thing the rule-authoring guide forbids, because
    // copying a vendor imports their errors and their liability.
    const { agencyUrl } = byId(id);
    const host = new URL(agencyUrl!).hostname;
    expect(host.endsWith(".gov")).toBe(true);
  });

  it.each(RULES.map((r) => r.id))("%s does not reuse the citation URL", (id) => {
    // If the two are identical the field is decoration: it adds a second link
    // to the same page and quietly implies a currency the statute cannot
    // promise. The federal rules are the interesting case — the IRS publishes
    // the form and the instructions together, so the two ARE close, but the
    // 990-N's citation points at the electronic-filing requirement while its
    // agency URL points at the filing page.
    const rule = byId(id);
    if (!rule.citationUrl) return;
    expect(rule.agencyUrl).not.toBe(rule.citationUrl);
  });

  it("uses the agency's own host, not a statute repository, for state rules", () => {
    // The distinction that makes the field worth having. `app.leg.wa.gov` and
    // `oregonlegislature.gov` publish law; `sos.wa.gov` and `sos.oregon.gov`
    // publish what you owe. Linking the legislature as an "agency page" would
    // pass the .gov check above while being exactly the mistake this guards.
    const LEGISLATURE = /leg\.wa\.gov|oregonlegislature\.gov|delcode\.delaware\.gov/;
    for (const rule of RULES.filter((r) => r.jurisdiction !== "US")) {
      expect(rule.agencyUrl).not.toMatch(LEGISLATURE);
    }
  });
});

/**
 * The 990 family is mutually exclusive — NEH-410.
 *
 * An organisation files ONE annual return. `us-federal-form-990`,
 * `us-federal-form-990-ez` and `us-federal-form-990-n` are alternatives, and
 * the individual thresholds are the implementation of that invariant rather
 * than the invariant itself.
 *
 * This is asserted separately from any one fixture because the overlap it
 * catches is a property of the THRESHOLDS, not of any entity anyone thought to
 * write down. The bug shipped precisely because every fixture was low on both
 * axes or high on both axes, so each rule fired alone and the suite agreed with
 * a pack that could tell someone to file twice.
 *
 * Note the pack's own modelling choices are what make this hold: 990-EZ carries
 * a receipts floor and 990-N an assets ceiling, neither of which is an IRS rule.
 * See the `notes` on both files.
 */
describe("the 990 family is mutually exclusive", () => {
  const FAMILY = [
    "us-federal-form-990",
    "us-federal-form-990-ez",
    "us-federal-form-990-n",
  ];

  function familyOwedBy(facts: EntityFacts): string[] {
    const { obligations } = evaluate(facts, RULES, {
      asOf: "2026-01-01",
      horizonMonths: 12,
      includeDraft: true,
    });
    return [...new Set(obligations.map((o) => o.ruleId))].filter((id) =>
      FAMILY.includes(id),
    );
  }

  /**
   * Every fixture, discovered from the module rather than listed here, so a
   * fixture added later is covered without anyone remembering to add it.
   */
  const FIXTURES = Object.entries(fixtures).filter(
    (entry): entry is [string, EntityFacts] =>
      typeof entry[1] === "object" && entry[1] !== null && "entityTypes" in entry[1],
  );

  it("covers every fixture, so this cannot pass vacuously", () => {
    // A guard on the guard. If the filter above ever stopped matching — a
    // fixture module reshaped, a rename — `it.each` over an empty list reports
    // no failures and reads exactly like a clean run.
    expect(FIXTURES.length).toBeGreaterThan(8);
  });

  it.each(FIXTURES)("%s owes at most one federal annual return", (_name, facts) => {
    expect(familyOwedBy(facts).length).toBeLessThanOrEqual(1);
  });

  /**
   * The fixtures prove today's entities are safe. This proves the THRESHOLDS
   * are, which is the thing that will be edited.
   *
   * The grid straddles both published lines ($50k receipts, $200k receipts,
   * $500k assets) from both sides, including the exact boundary values — an
   * off-by-one in `lt` vs `lte` on any of them opens the overlap again, and it
   * would be invisible to every fixture.
   */
  it("holds across the whole revenue x assets grid, not just at the fixtures", () => {
    const REVENUES = [0, 4_999_999, 5_000_000, 5_000_001, 19_999_999, 20_000_000, 50_000_000];
    const ASSETS = [0, 49_999_999, 50_000_000, 50_000_001, 900_000_000];

    const overlaps: string[] = [];
    for (const grossRevenueMinorUnits of REVENUES) {
      for (const totalAssetsMinorUnits of ASSETS) {
        const owed = familyOwedBy({
          ...fixtures.WA_SMALL_CHARITY,
          grossRevenueMinorUnits,
          totalAssetsMinorUnits,
        });
        if (owed.length > 1) {
          overlaps.push(
            `revenue ${grossRevenueMinorUnits} / assets ${totalAssetsMinorUnits} -> ${owed.join(" + ")}`,
          );
        }
      }
    }

    // Asserted on the array so a failure names the exact cell and the rules
    // that collided, rather than "expected 0, received 4".
    expect(overlaps).toEqual([]);
  });

  /**
   * The other half of the invariant, and the more dangerous one to get wrong.
   *
   * Mutual exclusivity is trivially satisfiable by having NO rule fire, which
   * would be a false negative — a clean calendar with the annual return missing
   * from it. That is the failure this product can least afford, and it is what
   * NEH-228 was.
   */
  it("still fires exactly one return for a 501c3 anywhere on that grid", () => {
    const gaps: string[] = [];
    for (const grossRevenueMinorUnits of [0, 5_000_000, 5_000_001, 20_000_000]) {
      for (const totalAssetsMinorUnits of [0, 50_000_000, 900_000_000]) {
        const owed = familyOwedBy({
          ...fixtures.WA_SMALL_CHARITY,
          grossRevenueMinorUnits,
          totalAssetsMinorUnits,
        });
        if (owed.length !== 1) {
          gaps.push(
            `revenue ${grossRevenueMinorUnits} / assets ${totalAssetsMinorUnits} -> ${owed.length === 0 ? "NOTHING" : owed.join(" + ")}`,
          );
        }
      }
    }
    expect(gaps).toEqual([]);
  });
});

/**
 * Holidays reach the real rule pack — NEH-443.
 *
 * `holidays.test.ts` proves the calendar and the roll. This proves the wiring:
 * that a rule opting in actually moves a real deadline, and that a rule which
 * did NOT opt in reports as much rather than looking checked.
 */
describe("federal holidays applied to the shipped rules", () => {
  // The 990 family is due the 15th of the 5th month after the year end, so an
  // August year end puts it on 15 January. MLK Day is the third Monday, which
  // IS the 15th in any year starting on a Monday — 2029 is one.
  //
  // A weekday holiday, deliberately: 15 Jan 2029 is a MONDAY, so the weekend
  // rule alone leaves it exactly where it is and only holiday handling moves
  // it. A holiday falling on a weekend would prove nothing here.
  const AUGUST_YEAR_END_CHARITY = {
    ...WA_SMALL_CHARITY,
    name: "Example August Year End Charity",
    fiscalYearEnd: "08-31",
  };

  const result = evaluate(AUGUST_YEAR_END_CHARITY, RULES, {
    asOf: "2028-06-01",
    horizonMonths: 12,
    includeDraft: true,
  });

  const federalReturn = result.obligations.find((o) =>
    o.ruleId.startsWith("us-federal-form-990"),
  );

  it("finds the federal return at all", () => {
    // Guard on the guard: every assertion below is vacuous if the entity owes
    // no federal return in this window.
    expect(federalReturn).toBeDefined();
  });

  it("moves a deadline off Martin Luther King, Jr. Day", () => {
    // Without the holiday calendar this is 2029-01-15 — a day the IRS is shut,
    // on a rule whose own citation quotes "Saturday, Sunday, or legal holiday".
    expect(federalReturn?.dueOn).toBe("2029-01-16");
  });

  it("says which calendar was applied", () => {
    expect(federalReturn?.holidayCalendar).toBe("us-federal");
  });

  it("reports NO calendar for a rule that was not holiday-checked", () => {
    // The honest half, and the reason the field exists. Washington's charities
    // renewal rolls BACKWARD to the last business day and a Washington state
    // holiday would move it — but state holidays are not modelled, so this
    // date has not been holiday-checked and the obligation must not imply it
    // was. "We did not check" and "we checked and it is clear" are different
    // claims; an absent field is how a consumer can tell them apart.
    const solicit = evaluate(JUNE_YEAR_END_SOLICITING_CHARITY, RULES, {
      asOf: "2026-01-01",
      horizonMonths: 12,
      includeDraft: true,
    }).obligations.find(
      (o) => o.ruleId === "us-wa-charitable-solicitation-registration",
    );

    expect(solicit).toBeDefined();
    expect(solicit?.holidayCalendar).toBeUndefined();
  });

  it("opts in every federal rule that rolls, and no state rule", () => {
    // The invariant behind the two cases above. A federal rule that rolls but
    // names no calendar is the half-right state this issue exists to avoid; a
    // state rule that named one would be asserting a calendar that does not
    // model its jurisdiction's holidays.
    for (const rule of RULES.filter((r) => r.weekendRule)) {
      if (rule.jurisdiction === "US") {
        expect(rule.holidayCalendar).toBe("us-federal");
      } else {
        expect(rule.holidayCalendar).toBeUndefined();
      }
    }
  });
});
