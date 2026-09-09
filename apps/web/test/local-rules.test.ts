/**
 * The operator's own rule directory — NEH-1255.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Every assertion here is about a FAILURE being loud. The success path is one
 * test; the other seven are the ways a rule file can be wrong, because the
 * outcome this file exists to prevent is a rule silently not loading — a
 * calendar that renders, looks complete, and is missing a filing.
 *
 * Written against real files in a temp directory rather than a mocked `fs`. The
 * thing under test is "what happens when an operator drops a file somewhere",
 * and a fake filesystem cannot fail the way a real directory does.
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Rule } from "@optima-compliance/engine";
import { ALL_RULES } from "@optima-compliance/rules";
import { RULES_DIR_ENV, allRules, loadRulesFrom, localRules } from "@/lib/local-rules";

/** A minimal rule that the schema accepts. Obviously fake, as fixtures must be. */
const VALID: Record<string, unknown> = {
  id: "us-wa-example-local-filing",
  jurisdiction: "US-WA",
  title: "Example Local Filing",
  agency: "Example County Auditor",
  entityTypes: ["nonprofit-corp"],
  cadence: { type: "annual", anchor: "calendar", month: 6, day: 30 },
  citation: "Example County Code 1.02.030",
  lastVerified: "2026-01-01",
  status: "draft",
  effectiveFrom: "2020-01-01",
};

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "optima-local-rules-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function write(name: string, body: unknown): void {
  const path = join(dir, name);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, typeof body === "string" ? body : JSON.stringify(body, null, 2));
}

describe("loadRulesFrom", () => {
  it("loads a valid rule and keeps every field", () => {
    write("example.json", VALID);

    const loaded = loadRulesFrom(dir);

    expect(loaded).toHaveLength(1);
    expect(loaded[0]).toMatchObject({
      id: "us-wa-example-local-filing",
      status: "draft",
      citation: "Example County Code 1.02.030",
    });
  });

  it("finds rules nested in subdirectories, like the shipped pack's us/<state>/ layout", () => {
    write(join("us", "wa", "example.json"), VALID);

    expect(loadRulesFrom(dir)).toHaveLength(1);
  });

  it("accepts the $schema line an editor needs, and does not pass it on", () => {
    // `additionalProperties: false` would reject it, and it is the one line that
    // gives a non-developer autocomplete while they write the rule.
    write("example.json", { $schema: "../schema/rule.v1.json", ...VALID });

    const loaded = loadRulesFrom(dir);

    expect(loaded).toHaveLength(1);
    expect(loaded[0]).not.toHaveProperty("$schema");
  });

  it("ignores files that are not .json", () => {
    write("example.json", VALID);
    write("notes.md", "not a rule");

    expect(loadRulesFrom(dir)).toHaveLength(1);
  });

  it("returns nothing for an empty directory, without throwing", () => {
    expect(loadRulesFrom(dir)).toEqual([]);
  });

  it("THROWS when the directory does not exist, naming the variable", () => {
    // The silent version of this is the whole failure mode: an operator with a
    // typo in the path gets a calendar that looks complete and is not.
    const missing = join(dir, "nope");

    expect(() => loadRulesFrom(missing)).toThrow(RULES_DIR_ENV);
    expect(() => loadRulesFrom(missing)).toThrow(missing);
  });

  it("THROWS on a file that is not JSON, naming the file", () => {
    write("broken.json", "{ this is not json");

    expect(() => loadRulesFrom(dir)).toThrow(/broken\.json.*not valid JSON/s);
  });

  it("THROWS on JSON that is not one rule object", () => {
    write("array.json", [VALID]);

    expect(() => loadRulesFrom(dir)).toThrow(/array\.json.*one rule object/s);
  });

  it("THROWS on a rule the schema rejects, and says which field", () => {
    const { citation: _dropped, ...noCitation } = VALID;
    write("no-citation.json", noCitation);

    expect(() => loadRulesFrom(dir)).toThrow(/rule\.v1\.json/);
    expect(() => loadRulesFrom(dir)).toThrow(/citation/);
  });

  it("THROWS on a status the schema does not define", () => {
    // "provisional" is the plausible invention. Accepting it would make the rule
    // neither draft nor active, and `evaluate` filters on `draft` — so it would
    // render UNBADGED alongside verified rows, which is the one outcome the
    // unverified badge exists to prevent.
    write("bad-status.json", { ...VALID, status: "provisional" });

    expect(() => loadRulesFrom(dir)).toThrow(/status/);
  });

  it("THROWS when a local rule reuses a SHIPPED rule id", () => {
    const shipped = ALL_RULES[0] as Rule;
    write("clash.json", { ...VALID, id: shipped.id });

    expect(() => loadRulesFrom(dir)).toThrow(/already in the shipped rule pack/);
  });

  it("THROWS when two local files share an id", () => {
    write("one.json", VALID);
    write("two.json", { ...VALID, title: "A second copy" });

    expect(() => loadRulesFrom(dir)).toThrow(/already in/);
  });
});

describe("localRules", () => {
  it("is empty when the variable is unset — the ordinary install", () => {
    expect(localRules({})).toEqual([]);
  });

  it("is empty when the variable is set to an empty string", () => {
    expect(localRules({ [RULES_DIR_ENV]: "" })).toEqual([]);
  });

  it("reads the directory the variable names", () => {
    write("example.json", VALID);

    expect(localRules({ [RULES_DIR_ENV]: dir })).toHaveLength(1);
  });
});

describe("allRules", () => {
  it("returns the shipped pack itself when there is nothing to add", () => {
    // Identity, not equality: the common install must allocate nothing.
    expect(allRules({})).toBe(ALL_RULES);
  });

  it("appends the operator's rules to the shipped pack", () => {
    write("example.json", VALID);

    const merged = allRules({ [RULES_DIR_ENV]: dir });

    expect(merged).toHaveLength(ALL_RULES.length + 1);
    // The shipped pack is unchanged and still first, so a local rule cannot
    // reorder or displace a published one.
    expect(merged.slice(0, ALL_RULES.length)).toEqual(ALL_RULES);
    expect(merged[merged.length - 1]).toMatchObject({ id: VALID.id });
  });

  it("picks up a file added after the first read, with no restart", () => {
    // The reason the directory is read per call rather than cached. Someone
    // authoring a rule edits and reloads; a cache would mean a restart per edit
    // on the one surface that exists because rebuilding was too slow a loop.
    expect(allRules({ [RULES_DIR_ENV]: dir })).toHaveLength(ALL_RULES.length);

    write("example.json", VALID);

    expect(allRules({ [RULES_DIR_ENV]: dir })).toHaveLength(ALL_RULES.length + 1);
  });
});
