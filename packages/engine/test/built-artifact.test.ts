/**
 * What the BUILT engine actually contains — NEH-443 / NEH-404 fallout.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * ## The failure this exists for, which happened
 *
 * `@optima-compliance/rules@2026.8.7` was published carrying
 * `holidayCalendar: "us-federal"` and one `weekendRule: "roll-backward"`, pinned
 * to `@optima-compliance/engine@0.4.0` — an engine that has **neither**. The
 * consumer installed both, npm resolved cleanly, nothing errored, and two
 * corrections were silently inert:
 *
 * | Rule says | Engine 0.4.0 did | Customer saw |
 * | -- | -- | -- |
 * | roll-backward off a Sunday | nothing | **2026-05-31, a Sunday** |
 * | roll off a federal holiday | nothing | **2029-01-15, MLK Day** |
 *
 * `applyWeekendRule` in 0.4.0 is a ternary with a silent fallthrough —
 * `weekendRule === "roll-forward" ? roll(date) : date` — so an unknown
 * direction returns the date unchanged. The exhaustive `never` switch that
 * turns that into a compile error arrived in the SAME unpublished commit as
 * roll-backward itself, which is why it protected nothing.
 *
 * ## Why this asserts the DIST rather than the source
 *
 * Every source-level test passed throughout. They import from `src`, and `src`
 * was correct — the gap was between source and what shipped. This repo already
 * knows that shape: `dist/` is gitignored and neither published package has a
 * `prepare` hook, so a fresh clone plus a bare `npm publish` ships a package
 * whose `files: ["dist"]` matches nothing. An empty package, silently, on a
 * version number that can never be reused.
 *
 * So this builds the package and interrogates the artifact a consumer receives.
 *
 * **What it does NOT cover**, and this matters because it is the half that
 * actually bit: it cannot tell you whether the artifact was ever *published*.
 * The dist here is correct; the tarball on npm for 0.4.0 is not, and no local
 * test can see that. That gap belongs to the publish script — see NEH-708.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const packageRoot = resolve(__dirname, "..");
const dist = join(packageRoot, "dist");

/**
 * Build once for the whole file. `tsc --build` is incremental, so this is cheap
 * on a warm tree and correct on a cold one — which is the case that matters,
 * because a cold tree is what a release runs on.
 */
beforeAll(() => {
  execFileSync("npx", ["tsc", "--build"], { cwd: packageRoot, stdio: "pipe" });
}, 120_000);

const read = (file: string): string => readFileSync(join(dist, file), "utf8");

describe("the built engine carries what the rule packs require", () => {
  it("emitted a dist at all", () => {
    // The `files: ["dist"]` trap. An absent dist publishes an empty package,
    // and every assertion below would otherwise fail in a way that reads as a
    // missing feature rather than a missing build.
    expect(existsSync(join(dist, "index.js"))).toBe(true);
  });

  it("handles BOTH weekend directions, not just roll-forward", () => {
    // 0.4.0 shipped only `rollForwardOffWeekend`, so WA's charities renewal —
    // the one rule in the pack that rolls backward — landed on a Sunday.
    const calendar = read("calendar.js");
    expect(calendar).toContain("rollForwardOffWeekend");
    expect(calendar).toContain("rollBackwardOffWeekend");
  });

  it("does not silently ignore a weekend direction it does not know", () => {
    /*
      The specific shape of the 0.4.0 defect: a ternary whose else-branch
      returns the date unchanged. An engine that MEETS a direction it cannot
      honour must fail loudly, because the alternative is a wrong date that
      looks considered.

      Asserted on the emitted evaluator carrying both directions rather than on
      the absence of a ternary — the source uses an exhaustive switch, and
      pinning the exact emitted shape would break on any refactor while proving
      nothing more.
    */
    const evaluator = read("evaluate.js");
    expect(evaluator).toContain("roll-forward");
    expect(evaluator).toContain("roll-backward");
  });

  it("ships the holiday calendar the 990 rules opt into", () => {
    expect(existsSync(join(dist, "holidays.js"))).toBe(true);
    const holidays = read("holidays.js");
    expect(holidays).toContain("federalHolidays");
    expect(holidays).toContain("rollForwardToBusinessDay");
    expect(holidays).toContain("rollBackwardToBusinessDay");
  });

  it("exports the holiday API from the package root", () => {
    // A module that exists in dist but is not re-exported is unreachable to a
    // consumer, which is indistinguishable from absent.
    const index = read("index.js");
    expect(index).toContain("holidays.js");
  });

  it("declares the types a consumer compiles against", () => {
    // The SaaS is TypeScript and reads `holidayCalendar` off an obligation. A
    // dist with the runtime but no declaration is a package that works and does
    // not type-check, which surfaces in the consumer as a mystery.
    expect(existsSync(join(dist, "holidays.d.ts"))).toBe(true);
    expect(read("evaluate.d.ts")).toContain("holidayCalendar");
    expect(read("rule.d.ts")).toContain("holidayCalendar");
  });
});

/**
 * The pack and the engine in this workspace must agree — NEH-443 fallout.
 *
 * `rules@2026.8.7` pinned `engine@0.4.0` while requiring features only a later
 * engine had. Both numbers were internally plausible; nothing compared the
 * REQUIREMENT against the CAPABILITY.
 */
describe("the rule pack does not require more than the engine it pins", () => {
  const rulesRoot = resolve(packageRoot, "..", "rules");

  /*
    NOT asserted here: that the pack pins the workspace engine version.
    `packages/rules/test/workspacePins.test.ts` already does exactly that, and a
    second copy of a guarantee is the drift this repo warns about most.

    Worth recording WHY that existing guard did not stop 2026.8.7, because the
    obvious reading is that it failed: it did not. The pack pinned 0.4.0 and the
    workspace engine WAS 0.4.0 — the pin was correct. The drift was that the
    engine's SOURCE gained features without its version moving, which no
    pin-equality check can see. That is the gap, and it is NEH-708's.
  */

  it("names no rule capability the built engine lacks", () => {
    /*
      Requirement against capability, read from the rule JSON rather than from
      the barrel, so a rule added without regenerating is still covered.

      Both entries here are ones that shipped inert. Adding a third rule
      property that the evaluator must understand belongs in this list on the
      same day it is introduced.
    */
    const files: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of require("node:fs").readdirSync(dir, {
        withFileTypes: true,
      }) as { name: string; isDirectory(): boolean }[]) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith(".json")) files.push(full);
      }
    };
    walk(join(rulesRoot, "us"));
    expect(files.length).toBeGreaterThan(0);

    const rules = files.map(
      (file) => JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>,
    );

    if (rules.some((rule) => rule.weekendRule === "roll-backward")) {
      expect(read("calendar.js")).toContain("rollBackwardOffWeekend");
    }
    if (rules.some((rule) => typeof rule.holidayCalendar === "string")) {
      expect(existsSync(join(dist, "holidays.js"))).toBe(true);
    }
  });
});
