/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Migration 6 against a database that already has entities in it.
 *
 * The sibling of `migration-private-foundation.test.ts`, and written the same
 * way for the same reason: against a real file seeded at migration 5, with a
 * real row in it, because the whole question is whether an EXISTING database
 * survives and an in-memory one has no past.
 *
 * ## What is at risk, and it is not the columns
 *
 * `is_supporting_organization` is nullable and **NULL is the answer**, exactly
 * as it is one migration earlier. A `NOT NULL DEFAULT 0` answers "not a
 * supporting organisation" on behalf of every organisation already in every
 * self-hoster's database — and a supporting organisation answered that way is
 * told to file the 990-N e-Postcard, which Rev. Proc. 2011-15 sec. 3.01 does
 * not permit it to file at any receipts level. That is the defect this
 * migration exists to fix, reintroduced one layer down.
 *
 * The two prior-year receipts columns carry a different risk: they are the
 * inputs to a three-year average, so a `DEFAULT 0` there would not fail loudly
 * either. It would drag every organisation's averaged receipts toward zero and
 * quietly qualify large ones for the postcard return — under-filing again, from
 * a column default.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { EntityFacts } from "@optima-compliance/engine";
import { MIGRATIONS } from "../src/schema.js";
import { EntityStore } from "../src/store.js";

const NEW_MIGRATION_ID = 6;

/** Every column this migration adds, and the shape each must have. */
const ADDED_COLUMNS = [
  "is_supporting_organization",
  "gross_revenue_prior_year_1_minor_units",
  "gross_revenue_prior_year_2_minor_units",
];

let dir: string;
let path: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "optima-migration-so-"));
  path = join(dir, "test.sqlite");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const BASE_FACTS: EntityFacts = {
  name: "Example Whatcom Library Friends Trust",
  entityTypes: ["501c3"],
  formedOn: "2012-06-18",
  homeJurisdiction: "US-WA",
  jurisdictions: ["US", "US-WA"],
  fiscalYearEnd: "12-31",
  grossRevenueMinorUnits: 1_800_000,
  totalAssetsMinorUnits: 9_000_000,
  solicitsCharitableContributions: false,
};

function seedAtPreviousMigration(): void {
  const db = new DatabaseSync(path);
  db.exec(
    "CREATE TABLE IF NOT EXISTS migrations (id INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)",
  );
  for (const migration of MIGRATIONS) {
    if (migration.id >= NEW_MIGRATION_ID) continue;
    db.exec(migration.sql);
    db.prepare(
      "INSERT INTO migrations (id, name, applied_at) VALUES (?, ?, ?)",
    ).run(migration.id, migration.name, "2026-01-01T00:00:00.000Z");
  }

  // An entity that predates these columns entirely — every entity in every
  // install does, which makes this the common case and not an edge one. It
  // answers the FOUNDATION question, deliberately: exactly one thing is
  // unanswered afterwards, so an assertion about the new column cannot be
  // satisfied by the old one being missing too.
  db.prepare(
    `INSERT INTO entities (
       id, name, entity_types, formed_on, home_jurisdiction, jurisdictions,
       fiscal_year_end, registered_on, gross_revenue_minor_units,
       total_assets_minor_units, employee_count,
       solicits_charitable_contributions, is_private_foundation,
       created_at, updated_at
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    "entity-old-1",
    BASE_FACTS.name,
    JSON.stringify(BASE_FACTS.entityTypes),
    BASE_FACTS.formedOn,
    BASE_FACTS.homeJurisdiction,
    JSON.stringify(BASE_FACTS.jurisdictions),
    BASE_FACTS.fiscalYearEnd,
    null,
    BASE_FACTS.grossRevenueMinorUnits ?? null,
    BASE_FACTS.totalAssetsMinorUnits ?? null,
    null,
    0,
    0,
    "2026-01-02T00:00:00.000Z",
    "2026-01-02T00:00:00.000Z",
  );
  db.close();
}

const openStore = () =>
  new EntityStore({ path, now: () => "2026-09-03T00:00:00.000Z" });

describe("migration 6, on a database that already has entities", () => {
  it("is appended, not inserted, and edits no earlier migration", () => {
    // "Append only" is the rule a shipped migration lives under: a self-hoster
    // has already run the earlier ones, so an edit changes what new installs
    // get without changing existing ones and the two diverge silently.
    const ids = MIGRATIONS.map((m) => m.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
    expect(new Set(ids).size).toBe(ids.length);
    expect(Math.max(...ids)).toBe(NEW_MIGRATION_ID);
  });

  it("applies cleanly and records itself", () => {
    seedAtPreviousMigration();
    openStore().close();

    const db = new DatabaseSync(path);
    const applied = (
      db.prepare("SELECT id FROM migrations ORDER BY id").all() as unknown as {
        id: number;
      }[]
    ).map((r) => r.id);
    db.close();

    expect(applied).toContain(NEW_MIGRATION_ID);
  });

  it("leaves every pre-existing row UNANSWERED, not answered 'no'", () => {
    // The assertion this file exists for. A `NOT NULL DEFAULT 0` passes "the
    // column exists" and "nothing was lost" and still ships the bug.
    seedAtPreviousMigration();
    openStore().close();

    const db = new DatabaseSync(path);
    const row = db
      .prepare("SELECT is_supporting_organization AS v FROM entities WHERE id = ?")
      .get("entity-old-1") as unknown as { v: number | null };
    db.close();

    expect(row.v).toBeNull();
  });

  it("leaves the prior-year receipts NULL, not zero", () => {
    // A zero here is not a missing value, it is a claim: "this organisation
    // earned nothing that year". Averaged into a three-year figure it drags
    // receipts down and qualifies a large organisation for the postcard return.
    seedAtPreviousMigration();
    openStore().close();

    const db = new DatabaseSync(path);
    const row = db
      .prepare(
        `SELECT gross_revenue_prior_year_1_minor_units AS y1,
                gross_revenue_prior_year_2_minor_units AS y2
           FROM entities WHERE id = ?`,
      )
      .get("entity-old-1") as unknown as { y1: number | null; y2: number | null };
    db.close();

    expect(row.y1).toBeNull();
    expect(row.y2).toBeNull();
  });

  it("reads that row back with the facts ABSENT, not false or zero", () => {
    // NULL in the column is only half the job: `false` is what a careless
    // `?? false` in `toFacts` would produce while the column stayed correct.
    seedAtPreviousMigration();
    const store = openStore();
    const entity = store.get("entity-old-1");
    store.close();

    expect(entity).toBeDefined();
    expect("isSupportingOrganization" in (entity as object)).toBe(false);
    expect("grossRevenuePriorYear1MinorUnits" in (entity as object)).toBe(false);
    expect("grossRevenuePriorYear2MinorUnits" in (entity as object)).toBe(false);
  });

  it("loses nothing that was already there, including the earlier answer", () => {
    seedAtPreviousMigration();
    const store = openStore();
    const entity = store.get("entity-old-1");
    store.close();

    expect(entity?.name).toBe(BASE_FACTS.name);
    expect(entity?.grossRevenueMinorUnits).toBe(1_800_000);
    expect(entity?.solicitsCharitableContributions).toBe(false);
    expect(entity?.isPrivateFoundation).toBe(false);
  });

  it("is idempotent across a reopen", () => {
    seedAtPreviousMigration();
    openStore().close();
    expect(() => openStore().close()).not.toThrow();
  });

  it.each(ADDED_COLUMNS)("adds %s nullable with no default", (name) => {
    const store = openStore();
    store.close();

    const db = new DatabaseSync(path);
    const columns = (
      db.prepare("PRAGMA table_info(entities)").all() as unknown as {
        name: string;
        notnull: number;
        dflt_value: string | null;
      }[]
    ).filter((c) => c.name === name);
    db.close();

    expect(columns).toHaveLength(1);
    expect(columns[0]?.notnull).toBe(0);
    expect(columns[0]?.dflt_value).toBeNull();
  });
});

describe("the new facts round-trip through storage", () => {
  it.each([
    ["a supporting organisation", true],
    ["not a supporting organisation", false],
  ] as const)("stores and returns %s", (_label, value) => {
    const store = openStore();
    store.create({ ...BASE_FACTS, isSupportingOrganization: value }, "e1");
    const read = store.get("e1");
    store.close();
    expect(read?.isSupportingOrganization).toBe(value);
  });

  it("stores an unanswered question as unanswered", () => {
    const store = openStore();
    store.create(BASE_FACTS, "e1");
    const read = store.get("e1");
    store.close();
    expect(read?.isSupportingOrganization).toBeUndefined();
  });

  it("lets an answer be taken back", () => {
    const store = openStore();
    store.create({ ...BASE_FACTS, isSupportingOrganization: true }, "e1");
    expect(store.get("e1")?.isSupportingOrganization).toBe(true);

    store.update("e1", BASE_FACTS);
    expect(store.get("e1")?.isSupportingOrganization).toBeUndefined();
    store.close();
  });

  it("keeps false distinct from unanswered across an update", () => {
    const store = openStore();
    store.create(BASE_FACTS, "e1");
    store.update("e1", { ...BASE_FACTS, isSupportingOrganization: false });
    expect(store.get("e1")?.isSupportingOrganization).toBe(false);
    store.close();
  });

  it("stores both prior years and returns them unchanged", () => {
    // A round trip rather than a write-only check. `charitableAssetsMinorUnits`
    // is the cautionary case in this very store: it is on `EntityFacts`, the
    // form collects it, and no column holds it, so it is silently dropped on
    // save. Nothing failed anywhere. Asserting the read is what distinguishes a
    // persisted fact from an accepted one.
    const store = openStore();
    store.create(
      {
        ...BASE_FACTS,
        grossRevenuePriorYear1MinorUnits: 3_000_000,
        grossRevenuePriorYear2MinorUnits: 5_500_003,
      },
      "e1",
    );
    const read = store.get("e1");
    store.close();
    expect(read?.grossRevenuePriorYear1MinorUnits).toBe(3_000_000);
    expect(read?.grossRevenuePriorYear2MinorUnits).toBe(5_500_003);
  });

  it("survives an update that changes them", () => {
    const store = openStore();
    store.create({ ...BASE_FACTS, grossRevenuePriorYear1MinorUnits: 1 }, "e1");
    store.update("e1", { ...BASE_FACTS, grossRevenuePriorYear1MinorUnits: 2 });
    expect(store.get("e1")?.grossRevenuePriorYear1MinorUnits).toBe(2);
    store.close();
  });

  it("distinguishes a genuine zero from an unsupplied year", () => {
    // An organisation really can take nothing in a year, and that is a
    // different fact from not having told us. Collapsing them is what a
    // `?? null` on a falsy value does, and it would change an average.
    const store = openStore();
    store.create({ ...BASE_FACTS, grossRevenuePriorYear1MinorUnits: 0 }, "e1");
    const read = store.get("e1");
    store.close();
    expect(read?.grossRevenuePriorYear1MinorUnits).toBe(0);
  });
});
