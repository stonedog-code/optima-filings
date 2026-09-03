/**
 * The automatic-revocation notice appears on the calendars it is about.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * ## Why this tier
 *
 * The same reason `draftBanner.test.ts` exists: this repo has no component tier
 * (`testEnvironment: "node"`, no testing-library), so the condition is an
 * exported pure function and the assertions live against a hand-built calendar
 * rather than a rendered page. The alternative was a condition nothing could
 * check except by loading a browser, which is how a warning ends up either
 * always on or never on and nobody notices which.
 *
 * ## What is actually at risk
 *
 * Two opposite failures, and this file asserts against both.
 *
 * **Never showing it** is the state before this change: 26 U.S.C. 6033(j) has
 * been recorded in `form-990-n.json`'s `notes` since the first federal rule was
 * written and no customer has ever seen it.
 *
 * **Always showing it** is the failure the draft banner already made once — a
 * warning that is on every page is furniture, and on an honesty surface that is
 * how the honesty surface stops being read.
 */

import { hasAnnualExemptOrganizationReturn } from "../src/lib/calendar";

type Calendar = Parameters<typeof hasAnnualExemptOrganizationReturn>[0];

function item(overrides: Record<string, unknown> = {}) {
  return {
    id: "us-wa-sos-llc-annual-report-2026-09-30",
    title: "LLC Annual Report",
    dueOn: "2026-09-30",
    source: "rule" as const,
    citation: "RCW 23.95.255(2)",
    status: "active" as const,
    ruleId: "us-wa-sos-llc-annual-report",
    jurisdiction: "US-WA",
    ...overrides,
  };
}

function indeterminate(overrides: Record<string, unknown> = {}) {
  return {
    ruleId: "us-federal-form-990-n",
    title: "Form 990-N",
    agency: "Internal Revenue Service",
    jurisdiction: "US",
    citation: "26 U.S.C. 6033(a)(3), (i)",
    status: "active" as const,
    lastVerified: "2026-09-03",
    missingFacts: ["isSupportingOrganization"],
    entityName: "Example Trust",
    entityId: "e1",
    ...overrides,
  };
}

function calendar(parts: {
  overdue?: unknown[];
  windows?: Record<string, unknown[]>;
  later?: unknown[];
  indeterminate?: unknown[];
}): Calendar {
  return {
    bucketed: {
      overdue: parts.overdue ?? [],
      windows: {
        "day-before": [],
        weekly: [],
        monthly: [],
        quarterly: [],
        ...(parts.windows ?? {}),
      },
      later: parts.later ?? [],
    },
    indeterminate: parts.indeterminate ?? [],
  } as unknown as Calendar;
}

describe("hasAnnualExemptOrganizationReturn", () => {
  it("is false for a calendar with no federal return on it", () => {
    // An LLC filing a state annual report has no exemption to lose. Showing it
    // a warning about revocation would be noise on the one surface that cannot
    // afford any.
    expect(
      hasAnnualExemptOrganizationReturn(
        calendar({ windows: { monthly: [item()] } }),
      ),
    ).toBe(false);
  });

  it("is false for an empty calendar", () => {
    expect(hasAnnualExemptOrganizationReturn(calendar({}))).toBe(false);
  });

  it.each([
    ["us-federal-form-990"],
    ["us-federal-form-990-ez"],
    ["us-federal-form-990-n"],
    ["us-federal-form-990-pf"],
  ])("is true for a dated %s", (ruleId) => {
    // All four, individually. Section 6033(j) counts a missed 990-PF exactly as
    // it counts a missed e-Postcard, and a list that quietly covered three of
    // the four would leave private foundations unwarned.
    expect(
      hasAnnualExemptOrganizationReturn(
        calendar({ windows: { monthly: [item({ ruleId, jurisdiction: "US" })] } }),
      ),
    ).toBe(true);
  });

  it("finds one in every bucket, not only the upcoming ones", () => {
    // `windows` is a Record of arrays, not an array. A flat `.some()` over
    // `Object.values(bucketed)` skips it silently — the same trap the dashboard
    // export link fell into — and it would drop the commonest case of all.
    const federal = item({ ruleId: "us-federal-form-990-n", jurisdiction: "US" });
    expect(hasAnnualExemptOrganizationReturn(calendar({ overdue: [federal] }))).toBe(
      true,
    );
    expect(hasAnnualExemptOrganizationReturn(calendar({ later: [federal] }))).toBe(
      true,
    );
    expect(
      hasAnnualExemptOrganizationReturn(
        calendar({ windows: { quarterly: [federal] } }),
      ),
    ).toBe(true);
  });

  it("is true when the only federal row is UNDECIDED", () => {
    // The case most easily missed and least safe to miss. An organisation that
    // has not answered the foundation or supporting-organisation question still
    // owes one of these returns — the product simply cannot say which yet — and
    // it is the reader whose federal position is least settled.
    expect(
      hasAnnualExemptOrganizationReturn(calendar({ indeterminate: [indeterminate()] })),
    ).toBe(true);
  });

  it("ignores an undecided rule that is not a federal annual return", () => {
    // The other direction, so "any indeterminate row" cannot masquerade as this
    // condition. Washington's charitable-trust registration is undecidable for
    // an entity that has not given its charitable assets, and it has nothing to
    // do with losing federal exemption.
    expect(
      hasAnnualExemptOrganizationReturn(
        calendar({
          indeterminate: [
            indeterminate({
              ruleId: "us-wa-charitable-trust-registration",
              jurisdiction: "US-WA",
              missingFacts: ["charitableAssetsMinorUnits"],
            }),
          ],
        }),
      ),
    ).toBe(false);
  });

  it("does not fire on a user-authored action that merely mentions a form", () => {
    // A user-authored row carries no `ruleId` at all. Matching on the title
    // would let somebody's own reminder called "File the 990" trigger a
    // statutory warning the product has no basis to show them.
    expect(
      hasAnnualExemptOrganizationReturn(
        calendar({
          windows: {
            monthly: [
              {
                id: "a1",
                title: "File the 990 with the accountant",
                dueOn: "2026-05-15",
                source: "user" as const,
              },
            ],
          },
        }),
      ),
    ).toBe(false);
  });
});
