/**
 * The E2E harness — NEH-373.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * ## Why this tier exists
 *
 * The dashboard IS the self-host deliverable. Milestone 1 is literally
 * `docker run` → add an entity → see a correct compliance calendar, and until
 * now **no part of that journey had ever been executed in a browser**. The unit
 * suite covers date arithmetic and parsing thoroughly; it cannot tell you the
 * entity form submits, the obligation table renders, or the disclaimer is
 * actually visible next to a deadline.
 *
 * **jsdom has no layout engine**, so every element reports a zero-sized box and
 * a test there will happily agree that a panel fits a viewport it overflows.
 * Anything about pixels, overflow, focus order or tap targets is structurally
 * unanswerable at the tier this repo had. NEH-275 — a WCAG contrast failure
 * caught only because someone wrote a bespoke contrast test against theme
 * tokens — was a unit test standing in for this one.
 *
 * ## This one runs the PRODUCTION build
 *
 * Unlike the hosted tier's harness (NEH-368), which is pinned to `next dev`
 * because the emailed verification link is deliberately not printed in
 * production. There is no email here at all, so `next build` + `next start` is
 * available — and it is what the suite uses, so what runs under test is the
 * artefact rather than a dev server that resembles it.
 *
 * ## Drafts are switched ON, on purpose
 *
 * `evaluate()` excludes drafts by default, which is the honest default and NOT
 * something to change. The suite opts in so a draft rule is rendered rather
 * than silently dropped.
 *
 * **It no longer buys what it once did.** This was written when the whole seed
 * set was `status: "draft"`: opting in was then the only way to render any row
 * at all, and every row rendered carried the per-row "unverified" badge. Since
 * pack `2026.8.6` the shipped set is entirely `active`, so obligations render
 * with or without the flag and no shipped row is badged.
 *
 * ## TWO servers, because the two halves of NEH-1255 contradict each other
 *
 * The shipped pack is entirely `active` and stays that way — promoting a real
 * rule back to `draft` to give a test something to look at would put an
 * unverified marker on a filing somebody has checked. So the draft case has to
 * come from OUTSIDE the pack, which is exactly what `OPTIMA_RULES_DIR` is for.
 *
 * But a draft rule on the calendar is precisely what the "does NOT cry wolf"
 * test asserts the absence of, and the banner is page-global. One server cannot
 * hold both facts. So:
 *
 * | server | port | extra rules | what it proves |
 * |---|---|---|---|
 * | main | 3200 | none | with only verified rules, NOTHING is badged and no banner appears |
 * | drafts | 3201 | `e2e/fixtures/extra-rules` | a draft row IS badged, and only that row |
 *
 * Playwright starts `webServer` entries **sequentially**, each waiting for its
 * URL before the next begins, so the second may simply `start` — the first has
 * already finished the build. Two builds on one `.next` would race.
 *
 * The positive banner case used to be unreachable from a browser and asserted
 * only in `apps/web/test/draftBanner.test.ts`. It is reachable now, and
 * `draft-rule.spec.ts` asserts it, because a mechanism for adding a draft rule
 * to a running install is the thing that was missing.
 */

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;
const BASE_URL = `http://127.0.0.1:${PORT}`;

/** The second server: same build, plus the operator-rules directory. */
const DRAFT_PORT = 3201;
const DRAFT_BASE_URL = `http://127.0.0.1:${DRAFT_PORT}`;

/**
 * Two FAKE rules, one of them dated and one undecidable, both `status: "draft"`.
 * Outside `packages/rules/us/`, so `rules:validate` never sees them and the
 * shipped pack stays entirely `active`. See the README beside them.
 */
const EXTRA_RULES_DIR = fileURLToPath(
  new URL("./e2e/fixtures/extra-rules", import.meta.url),
);

/**
 * A throwaway database per run, created at config load so the server can be
 * told where it is.
 *
 * Never the default `/data/optima.sqlite`: that is the path a self-hoster's
 * volume is mounted at, and a suite that writes entities into somebody's real
 * database is a suite that gets run exactly once. A fresh file also means every
 * run starts from a known-empty state, so "no entities yet" is a fact rather
 * than a hope.
 */
const dataDir = mkdtempSync(join(tmpdir(), "optima-e2e-"));
const DB_PATH = join(dataDir, "optima.sqlite");

/**
 * The draft server gets its OWN database, not a second handle on the first.
 * Two `next start` processes sharing one SQLite file would interleave writes,
 * and the entity each suite seeds would appear in the other's calendar — which
 * is exactly how the main server would come to show an unverified row.
 */
const draftDataDir = mkdtempSync(join(tmpdir(), "optima-e2e-drafts-"));
const DRAFT_DB_PATH = join(draftDataDir, "optima.sqlite");

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.artifacts/test-results",

  // Serial, sharing one database. Parallel workers would race on the entity
  // list, and that flake reads as a product bug rather than a harness one.
  workers: 1,
  fullyParallel: false,

  // No retries: on a suite this size a retry hides the intermittent failure
  // worth knowing about, and "it passed the second time" is how a real race
  // gets closed as flaky.
  retries: 0,

  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "desktop",
      // The draft spec addresses the OTHER server, so it must not also run here
      // — against 3200 there is no draft rule and every assertion in it would
      // fail for the right reason on the wrong server.
      testIgnore: /draft-rule\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // The viewport question jsdom cannot answer. A self-hoster checking a
      // deadline on their phone is the common case, and 375px is the narrow
      // end of what real people carry.
      //
      // Chromium is forced. `devices["iPhone SE"]` sets `defaultBrowserType:
      // "webkit"`, which is more faithful to a real iPhone and costs a second
      // browser download in every CI run and on every contributor's machine —
      // for assertions that are about LAYOUT AT 375px, where the engines agree.
      // The trade is deliberate; revisit it if a Safari-specific defect ever
      // gets through.
      name: "mobile",
      testIgnore: /draft-rule\.spec\.ts/,
      use: { ...devices["iPhone SE"], browserName: "chromium" },
    },
    {
      /*
       * The unverified badge, against a server carrying two draft rules that
       * did not ship — NEH-1255.
       *
       * Desktop only, and one project rather than two: what it asserts is which
       * ROW carries the marker, and that is the same claim at 375px as at
       * 1280px. Running it twice would double a five-minute suite's slowest
       * part for no second fact. The layout questions belong to `layout.spec.ts`
       * and `stylesheet.spec.ts`, which do run at both widths.
       */
      name: "draft-rules",
      testMatch: /draft-rule\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: DRAFT_BASE_URL },
    },
  ],

  webServer: [
    {
      // `build` then `start`, not `dev`. Slower to boot and worth it: this is the
      // only tier that can tell you the thing users actually run works, and a dev
      // server differs from it in exactly the ways that bite — compilation,
      // minification, and server/client component boundaries.
      command: `npm run build --workspace=@optima-compliance/web && npm run start --workspace=@optima-compliance/web -- --port ${PORT}`,
      url: BASE_URL,
      // Never reuse: a server already running has unknown configuration, quite
      // possibly pointed at a real database.
      reuseExistingServer: false,
      // Generous — a cold Next build with Panda codegen is minutes, not seconds.
      timeout: 300_000,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        OPTIMA_DB_PATH: DB_PATH,
        // See the header: without this the seed set is invisible and there is
        // nothing to assert.
        OPTIMA_INCLUDE_DRAFT: "true",
      },
    },
    {
      /*
       * The same artefact, with the operator's own rules — and NO build.
       *
       * Playwright runs webServer setups one after another and waits for each
       * URL, so `.next` is already built by the time this starts. It is also
       * why this one is second rather than first: `start` before `build` would
       * find nothing to serve.
       */
      command: `npm run start --workspace=@optima-compliance/web -- --port ${DRAFT_PORT}`,
      url: DRAFT_BASE_URL,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        OPTIMA_DB_PATH: DRAFT_DB_PATH,
        OPTIMA_INCLUDE_DRAFT: "true",
        // The mechanism under test. Without it this server is byte-identical to
        // the one above, which is what makes the difference in what renders
        // attributable to the rules directory and nothing else.
        OPTIMA_RULES_DIR: EXTRA_RULES_DIR,
      },
    },
  ],
});
