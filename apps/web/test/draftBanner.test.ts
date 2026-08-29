/**
 * The unverified banner tracks the DATA, not the flag — NEH-1255.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * ## Why this tier and not a browser test
 *
 * The condition cannot be exercised end to end. Every rule in the shipped pack
 * has been `status: "active"` since `2026.8.6`, and there is no supported way
 * to put a draft rule into a running install — no local-pack directory, no
 * injection point. So a browser can only ever see the negative case, which is
 * exactly the regression this fixes and is asserted in `calendar.spec.ts`.
 *
 * The positive case — a draft IS present, so the banner must appear — lives
 * here, against a hand-built calendar. That is why `hasDraftItems` is a pure
 * exported function rather than an expression inline in the page: a condition
 * with no way to construct its true case is a condition nothing can check.
 *
 * The per-row badge itself is still uncovered; it needs either a component
 * tier (this repo has none — `testEnvironment: "node"`, no testing-library) or
 * a way to load a local rule pack. NEH-1255 stays open for that.
 */

import { hasDraftItems } from "../src/lib/calendar";

type Calendar = Parameters<typeof hasDraftItems>[0];

function item(overrides: Record<string, unknown> = {}) {
  return {
    id: "us-wa-sos-llc-annual-report-2026-09-30",
    title: "LLC Annual Report",
    dueOn: "2026-09-30",
    source: "rule" as const,
    citation: "RCW 23.95.255(2)",
    status: "active" as const,
    ...overrides,
  };
}

function indeterminate(overrides: Record<string, unknown> = {}) {
  return {
    ruleId: "us-federal-form-990-n",
    title: "Form 990-N",
    agency: "IRS",
    jurisdiction: "US",
    citation: "26 U.S.C. 6033(i)",
    status: "active" as const,
    lastVerified: "2026-08-01",
    missingFacts: ["grossRevenueMinorUnits"],
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

describe("hasDraftItems", () => {
  it("is false for a calendar of verified rules, which is every shipped pack since 2026.8.6", () => {
    const cal = calendar({
      overdue: [item()],
      windows: { monthly: [item({ id: "b" })] },
      later: [item({ id: "c" })],
      indeterminate: [indeterminate()],
    });

    // Non-vacuity: the calendar must actually hold items, or `false` here says
    // nothing at all. This is the assertion the old e2e test lacked.
    expect(cal.bucketed.overdue).toHaveLength(1);
    expect(cal.bucketed.windows.monthly).toHaveLength(1);
    expect(cal.bucketed.later).toHaveLength(1);
    expect(cal.indeterminate).toHaveLength(1);

    expect(hasDraftItems(cal)).toBe(false);
  });

  it("is false for an empty calendar", () => {
    expect(hasDraftItems(calendar({}))).toBe(false);
  });

  // Each bucket separately. A single "somewhere in the calendar" test passes
  // while three of the four branches are unreachable, and `windows` is the one
  // that would break: it is a Record of arrays, so a flat `.some()` over
  // `Object.values(bucketed)` misses it and misses it silently.
  it.each([
    ["overdue", calendar({ overdue: [item({ status: "draft" })] })],
    [
      "a window",
      calendar({ windows: { quarterly: [item({ status: "draft" })] } }),
    ],
    ["later", calendar({ later: [item({ status: "draft" })] })],
    [
      "the indeterminate list",
      calendar({ indeterminate: [indeterminate({ status: "draft" })] }),
    ],
  ])("is true when a draft sits in %s", (_where, cal) => {
    expect(hasDraftItems(cal)).toBe(true);
  });

  it("is true when one draft hides among verified rows", () => {
    expect(
      hasDraftItems(
        calendar({
          overdue: [item(), item({ id: "b", status: "draft" }), item({ id: "c" })],
        }),
      ),
    ).toBe(true);
  });
});
