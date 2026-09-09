/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { parseArgs, todayUtc } from "../src/args.js";
import {
  DISCLAIMER,
  REVOCATION_NOTICE,
  formatMoney,
  renderResult,
} from "../src/format.js";
import type { EvaluationResult } from "@optima-compliance/engine";

describe("parseArgs", () => {
  it("requires an entity file", () => {
    expect(parseArgs(["check"])).toEqual({
      kind: "error",
      message: "--entity is required",
    });
  });

  it("defaults the horizon and the draft setting", () => {
    const parsed = parseArgs(["check", "--entity", "e.json", "--as-of", "2026-01-01"]);
    expect(parsed).toMatchObject({
      kind: "check",
      options: {
        horizonMonths: 12,
        includeDraft: false,
        format: "text",
        reminderDaysBefore: [],
      },
    });
  });

  it("treats --json as shorthand for --format json", () => {
    // Kept because it shipped before --format existed and scripts may use it.
    expect(parseArgs(["check", "--entity", "e.json", "--json"])).toMatchObject({
      kind: "check",
      options: { format: "json" },
    });
  });

  it.each(["yaml", "pdf", "ical", ""])(
    "rejects the unsupported --format value %s",
    (value) => {
      expect(
        parseArgs(["check", "--entity", "e.json", "--format", value]),
      ).toMatchObject({ kind: "error" });
    },
  );

  it.each(["-1", "1.5", "400", "thirty", "30,x"])(
    "rejects the malformed --remind value %s",
    (value) => {
      expect(
        parseArgs(["check", "--entity", "e.json", "--remind", value]),
      ).toMatchObject({ kind: "error" });
    },
  );

  it("parses a comma-separated reminder list", () => {
    expect(
      parseArgs(["check", "--entity", "e.json", "--remind", "30, 7"]),
    ).toMatchObject({ kind: "check", options: { reminderDaysBefore: [30, 7] } });
  });

  it("defaults asOf to today rather than leaving it unset", () => {
    // The engine is clock-free by design, so something has to supply the date.
    // That something is the process boundary, and nowhere further in.
    const parsed = parseArgs(["check", "--entity", "e.json"]);
    expect(parsed.kind).toBe("check");
    if (parsed.kind !== "check") return;
    expect(parsed.options.asOf).toBe(todayUtc());
  });

  it.each(["2026-1-1", "01-01-2026", "tomorrow", "2026/01/01"])(
    "rejects the malformed --as-of value %s",
    (value) => {
      expect(parseArgs(["check", "--entity", "e.json", "--as-of", value])).toMatchObject(
        { kind: "error" },
      );
    },
  );

  it.each(["0", "-3", "1.5", "601", "many"])(
    "rejects the out-of-range --months value %s",
    (value) => {
      expect(parseArgs(["check", "--entity", "e.json", "--months", value])).toMatchObject(
        { kind: "error" },
      );
    },
  );

  it("rejects an unknown option rather than ignoring it", () => {
    // Silently ignoring a typo like --include-drafts would produce an answer
    // the user believes includes drafts and does not.
    expect(
      parseArgs(["check", "--entity", "e.json", "--include-drafts"]),
    ).toMatchObject({ kind: "error", message: "Unknown option: --include-drafts" });
  });

  it("treats no arguments as help, not as an error", () => {
    expect(parseArgs([])).toEqual({ kind: "help" });
  });
});

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
    // The reason the whole codebase carries integer minor units. 1999 / 100 in
    // float arithmetic is where "$19.99" quietly becomes "$19.990000000000002".
    for (let cents = 0; cents < 1000; cents += 1) {
      expect(formatMoney(cents)).toMatch(/^\$\d+\.\d{2}$/);
    }
  });
});

const emptyResult: EvaluationResult = { obligations: [], indeterminate: [] };

const baseObligation = {
  ruleId: "us-wa-sos-nonprofit-annual-report",
  title: "Nonprofit Corporation Annual Report",
  agency: "Washington Secretary of State",
  jurisdiction: "US-WA",
  dueOn: "2026-03-31",
  citation: "RCW 24.03A.1010",
  lastVerified: "2026-08-01",
} as const;

const render = (result: EvaluationResult) =>
  renderResult(result, {
    entityName: "Example Cascade Trails Association",
    asOf: "2026-01-01",
    horizonMonths: 12,
  });

describe("renderResult", () => {
  it("always carries the disclaimer", () => {
    // Not behind --help. This tool tells people when to file with a government
    // and a missed deadline costs real money, so the caveat belongs where the
    // answer is, every single time.
    expect(render(emptyResult)).toContain(DISCLAIMER);
  });

  it("says so plainly when nothing is due", () => {
    expect(render(emptyResult)).toContain("Nothing due in this window.");
  });

  it("shows the due date, jurisdiction, fee, and citation", () => {
    const output = render({
      obligations: [
        { ...baseObligation, status: "active", feeMinorUnits: 6000, currency: "USD" },
      ],
      indeterminate: [],
    });
    expect(output).toContain("2026-03-31");
    expect(output).toContain("US-WA");
    expect(output).toContain("$60.00");
    expect(output).toContain("RCW 24.03A.1010");
  });

  it('shows an em dash, never "$0.00", when no fee is recorded', () => {
    // Reporting zero would claim the filing is free. What we actually know is
    // that nobody recorded a fee.
    const output = render({
      obligations: [{ ...baseObligation, status: "active" }],
      indeterminate: [],
    });
    expect(output).toContain("—");
    expect(output).not.toContain("$0.00");
  });

  it("shows an inexact fee as a range, with its reason on its own line", () => {
    // A fixed-width column cannot hold a sentence, and a range with no reason
    // is a number nobody can act on — so the explanation goes beneath the row
    // rather than being dropped (NEH-403).
    const output = render({
      obligations: [
        {
          ...baseObligation,
          status: "active",
          currency: "USD",
          feeRange: {
            basis: "computed",
            minimumMinorUnits: 22_500,
            maximumMinorUnits: 25_005_000,
            explanation: "Delaware computes this per corporation; use their calculator.",
            currency: "USD",
          },
        },
      ],
      indeterminate: [],
    });

    expect(output).toContain("$225.00 – $250,050.00");
    expect(output).toContain("Delaware computes this per corporation");
    // The floor alone must never be what the FEE column says.
    expect(output).not.toMatch(/FEE\s*\n\s*\$225\.00\s*$/m);
  });

  it("marks every draft line and explains what draft means", () => {
    const output = render({
      obligations: [{ ...baseObligation, status: "draft", feeMinorUnits: 6000 }],
      indeterminate: [],
    });
    expect(output).toContain("[DRAFT]");
    expect(output).toContain("NOT yet checked against");
  });

  it("does not warn about drafts when there are none", () => {
    const output = render({
      obligations: [{ ...baseObligation, status: "active" }],
      indeterminate: [],
    });
    expect(output).not.toContain("[DRAFT]");
  });

  it("reports indeterminate rules and names the missing facts", () => {
    // An incomplete calendar presented as complete is this product's worst
    // failure. The user can usually fix it by supplying one number.
    const output = render({
      obligations: [],
      indeterminate: [
        {
          ruleId: "us-federal-form-990",
          title: "Form 990",
          jurisdiction: "US",
          missingFacts: ["grossRevenueMinorUnits"],
        },
      ],
    });
    expect(output).toContain("Cannot tell yet");
    expect(output).toContain("Form 990");
    expect(output).toContain("grossRevenueMinorUnits");
  });

  it("keeps columns aligned when titles differ in length", () => {
    const output = render({
      obligations: [
        { ...baseObligation, status: "active", dueOn: "2026-03-31" },
        {
          ...baseObligation,
          ruleId: "us-federal-form-990-n",
          title: "Form 990-N (e-Postcard)",
          agency: "Internal Revenue Service",
          jurisdiction: "US",
          dueOn: "2026-05-15",
          status: "active",
        },
      ],
      indeterminate: [],
    });
    const dueLines = output
      .split("\n")
      .filter((line) => /^\s+20\d\d-\d\d-\d\d/.test(line));
    expect(dueLines).toHaveLength(2);
    // Every row's WHERE column starts at the same offset.
    const offsets = dueLines.map((line) => line.indexOf("US"));
    expect(new Set(offsets).size).toBe(1);
  });
});

/**
 * The consequence that is not a late fee.
 *
 * 26 U.S.C. 6033(j) revokes exempt status automatically when an annual return
 * or e-Postcard goes unfiled for three consecutive years. The rule pack has
 * carried that in a `notes` field since the first federal rule was written and
 * no user of this tool has ever seen it — a printed row for Form 990-N looked
 * exactly like a printed row for a state annual report.
 *
 * Both directions are asserted. Never printing it is the state before this
 * change; always printing it is the failure the web tier's draft banner already
 * made once, and a warning that is always there is furniture.
 */
describe("the automatic-revocation notice", () => {
  const federalObligation = {
    ...baseObligation,
    ruleId: "us-federal-form-990-n",
    title: "Form 990-N (e-Postcard)",
    agency: "Internal Revenue Service",
    jurisdiction: "US",
    dueOn: "2026-05-15",
    citation: "26 U.S.C. 6033(a)(3), (i)",
  } as const;

  it("is absent from a run with no federal return on it", () => {
    // An LLC filing a state annual report has no exemption to lose.
    const output = render({
      obligations: [{ ...baseObligation, status: "active" }],
      indeterminate: [],
    });
    expect(output).not.toContain("CONSECUTIVE YEARS");
  });

  it("is absent when nothing is due at all", () => {
    expect(render(emptyResult)).not.toContain("CONSECUTIVE YEARS");
  });

  it.each([
    "us-federal-form-990",
    "us-federal-form-990-ez",
    "us-federal-form-990-n",
    "us-federal-form-990-pf",
  ])("is printed for a dated %s", (ruleId) => {
    // All four individually. Section 6033(j) counts a missed 990-PF exactly as
    // it counts a missed e-Postcard, and covering three of the four would leave
    // private foundations unwarned.
    const output = render({
      obligations: [{ ...federalObligation, ruleId, status: "active" }],
      indeterminate: [],
    });
    expect(output).toContain(REVOCATION_NOTICE);
  });

  it("is printed when the only federal row is UNDECIDED", () => {
    // The case most easily missed and least safe to miss: an organisation that
    // has not answered the foundation or supporting-organisation question still
    // owes one of these returns.
    const output = render({
      obligations: [],
      indeterminate: [
        {
          ruleId: "us-federal-form-990-n",
          title: "Form 990-N (e-Postcard)",
          jurisdiction: "US",
          missingFacts: ["isSupportingOrganization"],
        },
      ],
    } as unknown as EvaluationResult);
    expect(output).toContain(REVOCATION_NOTICE);
  });

  it("cites the statute and disclaims any knowledge of past filings", () => {
    // Nothing here records what anybody filed in a prior year, so the notice
    // must state the rule and say nothing about the reader. A compliance tool
    // implying somebody's exemption is at risk, on evidence it does not have,
    // is a worse claim than the silence it replaced.
    expect(REVOCATION_NOTICE).toContain("26 U.S.C. 6033(j)");
    expect(REVOCATION_NOTICE).toContain("nothing here knows what you have filed");
  });

  it("carries no issue id, branch name or internal detail", () => {
    // Everything this tool prints is read by a customer. The reasoning belongs
    // in the code comment and in the tracker, never in the output.
    expect(REVOCATION_NOTICE).not.toMatch(/NEH-\d+/);
    expect(REVOCATION_NOTICE).not.toMatch(/\b(?:fix|feat|chore)\//);
  });
});
