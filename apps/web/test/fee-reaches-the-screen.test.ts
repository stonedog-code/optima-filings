/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * A fee, from the rule pack all the way to the shape a component renders.
 *
 * ## Why this seam specifically
 *
 * `apps/web/src/lib/calendar.ts` builds its `DatedItem`s field by field, so a
 * field nobody names is silently absent and NOTHING FAILS. That has already
 * happened twice in this file: `citationUrl` made the trip and rendered as
 * unclickable text for as long as the screen existed, and `ruleId` and
 * `jurisdiction` were missing so a report about a row could not identify it.
 *
 * The fee was the third and the worst of them. `formatFee` existed in
 * `lib/format.ts`, had a test, and had NO CALLER — because no fee ever reached a
 * component. The cost of a filing was visible in the CLI, in the CSV and in the
 * calendar invite, and nowhere on the dashboard that most people actually use
 * (NEH-403). A unit test of `formatFee` passed throughout, which is what makes
 * this a seam test rather than another one of those.
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "optima-fee-seam-"));
process.env.OPTIMA_DB_PATH = join(dir, "optima.sqlite");
process.env.OPTIMA_DOCUMENTS_DIR = join(dir, "documents");

// Imported AFTER the env is set: `DB_PATH` is resolved at module load, so a
// top-level import would open the default database instead of this temporary one.
const { allDatedItems } = require("../src/lib/calendar") as typeof import("../src/lib/calendar");
const { getStore } = require("../src/lib/server") as typeof import("../src/lib/server");

const DE_RULE = "us-de-corporation-annual-report";
const WA_RULE = "us-wa-sos-nonprofit-annual-report";

beforeAll(() => {
  getStore().create(
    {
      name: "Test Delaware Corporation",
      entityTypes: ["c-corp"],
      formedOn: "2020-01-15",
      homeJurisdiction: "US-DE",
      jurisdictions: ["US-DE"],
      fiscalYearEnd: "12-31",
    },
    "test-de-corp",
  );
  getStore().create(
    {
      name: "Test Washington Nonprofit",
      entityTypes: ["nonprofit-corp"],
      formedOn: "2020-04-10",
      homeJurisdiction: "US-WA",
      jurisdictions: ["US-WA"],
      fiscalYearEnd: "12-31",
    },
    "test-wa-nonprofit",
  );
});

describe("a fee reaches the item a component renders", () => {
  const items = () => allDatedItems("2026-01-01").filter((i) => i.source === "rule");

  it("carries a computed range as words, not as a bare minimum", () => {
    const de = items().find((i) => i.ruleId === DE_RULE);

    expect(de).toBeDefined();
    // The exact string, because the failure this guards is a plausible-looking
    // WRONG string — "$225.00" is what a consumer that took the floor would show.
    expect(de!.fee).toBe("$225.00 – $250,050.00");
    expect(de!.fee).not.toBe("$225.00");
  });

  it("carries the REASON for the range, or the number is unusable", () => {
    const de = items().find((i) => i.ruleId === DE_RULE);

    expect(de!.feeReason).toBeDefined();
    expect(de!.feeReason).toMatch(/franchise tax/i);
    // Written for a filer. Same rule as the terms page: no issue ids, no
    // tracker links, nothing that needs repository access to parse.
    expect(de!.feeReason).not.toMatch(/NEH-\d+|linear\.app|github\.com/i);
  });

  it("carries a conditional range too", () => {
    const wa = items().find((i) => i.ruleId === WA_RULE);

    expect(wa).toBeDefined();
    expect(wa!.fee).toBe("$20.00 – $60.00");
    expect(wa!.feeReason).toMatch(/certif/i);
  });

  it("examines a non-empty set", () => {
    // The input-set size. Every assertion above uses `.find`, and `find` on an
    // empty list returns undefined — so a projection that carried nothing at
    // all would fail these tests for the right reason only by luck. This is the
    // one that says the calendar had rows in it.
    expect(items().length).toBeGreaterThanOrEqual(2);
  });
});
