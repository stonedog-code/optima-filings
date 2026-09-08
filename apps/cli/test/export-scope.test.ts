/**
 * What the CLI's `--format csv` and `--format ics` actually contain.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * ## The decision this file pins, and why it went the way it did
 *
 * The self-host dashboard has two kinds of dated item: obligations the engine
 * DERIVED from a cited statute, and actions a person WROTE DOWN themselves. Its
 * export route carries both. This tool carries only the first, and that is a
 * decision rather than an oversight:
 *
 * - It has no store. Its whole input is a facts file, and `evaluate` is pure —
 *   opening a database would change what the command requires to run.
 * - A stored action points at a STORED entity by id. An entity read out of a
 *   JSON file has no id, so there is no join between the two; handing this
 *   command a database would mean printing every action in it beside one file's
 *   obligations, which is a different command from `check --entity`.
 *
 * ## So the fix is to SAY so, and the saying is what these tests hold
 *
 * A file that quietly covers half of somebody's calendar is the problem,
 * whether the missing half was dropped or was never in scope. The user-visible
 * remedy is that the scope is stated — in `--help` before the run, and on
 * stderr during it — so nobody mistakes this export for their whole calendar.
 *
 * The last test guards the PREMISE rather than the wording: the reasoning above
 * holds only while this package has no way to reach a store. If that ever
 * changes, the decision is due to be revisited, and a note that has quietly
 * become false is worse than none.
 */

import { toCsv } from "@optima-compliance/export";
import type { CalendarAction } from "@optima-compliance/export";
import type { Obligation } from "@optima-compliance/engine";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { USAGE } from "../src/args.js";
import { EXPORT_SCOPE_NOTE } from "../src/format.js";

describe("the export scope note", () => {
  it("says what the file holds, in the user's terms", () => {
    expect(EXPORT_SCOPE_NOTE).toMatch(/rule/i);
    expect(EXPORT_SCOPE_NOTE).toMatch(/deadlines you (?:have )?added|added yourself/i);
  });

  it("names both formats it applies to, not just the one that prompted it", () => {
    // The ticket was filed against csv. ics has exactly the same scope, and a
    // note that mentioned one would imply the other was complete.
    expect(EXPORT_SCOPE_NOTE.toLowerCase()).toContain("csv");
    expect(EXPORT_SCOPE_NOTE.toLowerCase()).toContain("calendar file");
  });

  it("is discoverable before the run, not only during it", () => {
    // Somebody scripting an export reads --help once and never sees stderr
    // again, so the scope has to be in the usage text too.
    expect(USAGE).toMatch(/added yourself|added in the dashboard/i);
  });

  it("carries no issue id, branch name or internal detail", () => {
    // Everything this tool prints is read by a customer. The reasoning belongs
    // in the code comment and in the tracker, never in the output.
    for (const text of [EXPORT_SCOPE_NOTE, USAGE]) {
      expect(text).not.toMatch(/NEH-\d+/);
      expect(text).not.toMatch(/\b(?:fix|feat|chore)\//);
      expect(text).not.toMatch(/sqlite|EntityStore|listActions/i);
    }
  });
});

describe("which half of the pipeline is the limitation", () => {
  it("is this command's scope, not the serialiser — it carries both kinds today", () => {
    // The fixture the ticket asked for: both kinds, and an assertion that fails
    // if one is dropped. Run against the serialiser rather than against the
    // command, because that is where the answer actually differs — if this ever
    // fails, wiring a store into the CLI would not be enough either.
    const obligation = {
      ruleId: "us-federal-form-990-n",
      title: "Form 990-N (e-Postcard)",
      jurisdiction: "US",
      agency: "Internal Revenue Service",
      dueOn: "2026-05-15",
      citation: "26 U.S.C. 6033(i)",
      status: "active",
    } as unknown as Obligation;
    const action: CalendarAction = {
      id: "a1",
      title: "Respond to the letter dated 2 March",
      dueOn: "2026-03-31",
    };

    const rows = toCsv([obligation, action]).trim().split("\n");
    expect(rows.length).toBe(3); // header + one of each
    expect(rows.join("\n")).toContain("Form 990-N (e-Postcard)");
    expect(rows.join("\n")).toContain("Respond to the letter dated 2 March");
  });
});

describe("the premise the decision rests on", () => {
  const manifest = JSON.parse(
    readFileSync(join(__dirname, "..", "package.json"), "utf8"),
  ) as { dependencies?: Record<string, string> };

  it("is non-vacuous: this package really does declare dependencies", () => {
    // Without this, the assertion below passes just as happily against a
    // manifest that failed to parse into anything.
    const names = Object.keys(manifest.dependencies ?? {});
    expect(names.length).toBeGreaterThan(0);
    expect(names).toContain("@optima-compliance/export");
  });

  it("has no way to reach a store, which is why the scope is what it is", () => {
    // If this fails, the CLI has gained a database and the reasoning in this
    // file's header no longer holds. Revisit the decision — and the note —
    // rather than deleting this test.
    expect(Object.keys(manifest.dependencies ?? {})).not.toContain(
      "@optima-compliance/db",
    );
  });
});
