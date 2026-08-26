/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Migration 5 against a database that already has entities in it — NEH-1146.
 *
 * ## What is actually at risk here
 *
 * The column is trivial; the DEFAULT is not. `is_private_foundation` is
 * nullable, and NULL has to survive both the migration and the round trip back
 * out through `EntityFacts`, because the engine reads an absent fact as
 * *unknown* and reports the 990 family as indeterminate rather than deciding
 * it. A `NOT NULL DEFAULT 0` here — the obvious, tidy-looking choice — would
 * answer "public charity" on behalf of every organisation already in every
 * self-hoster's database, and a private foundation answered that way is told to
 * file the 990-N e-Postcard, which the IRS does not permit it to file at any
 * receipts level. That is the defect this migration exists to fix, reintroduced
 * one layer down.
 *
 * So this runs the real migration runner against a real database file seeded at
 * migration 4, with a real row in it, and asserts the third state is still
 * three states afterwards. A mock cannot answer that, and neither can
 * `:memory:` — the whole question is whether an EXISTING database survives, and
 * an in-memory database has no past.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { EntityFacts } from "@optima-compliance/engine";
import { MIGRATIONS } from "../src/schema.js";
import { EntityStore } from "../src/store.js";

/** The migration under test, and the state a database must be in before it. */
const NEW_MIGRATION_ID = 5;

let dir: string;
let path: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "optima-migration-pf-"));
  path = join(dir, "test.sqlite");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const BASE_FACTS: EntityFacts = {
  name: "Example Harbor Light Family Foundation",
  entityTypes: ["501c3"],
  formedOn: "2015-04-02",
  homeJurisdiction: "US-WA",
  jurisdictions: ["US", "US-WA"],
  fiscalYearEnd: "12-31",
  grossRevenueMinorUnits: 2_000_000,
  totalAssetsMinorUnits: 3_000_000,
  solicitsCharitableContributions: false,
};

/**
 * Build a database at the state BEFORE the new migration, the same way a real
 * install got there: by running the earlier migrations, in order, through the
 * same SQL that shipped.
 */
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

  // An entity that predates the column entirely — every entity in every
  // install does, which is what makes this the common case and not an edge one.
  db.prepare(
    `INSERT INTO entities (
       id, name, entity_types, formed_on, home_jurisdiction, jurisdictions,
       fiscal_year_end, registered_on, gross_revenue_minor_units,
       total_assets_minor_units, employee_count,
       solicits_charitable_contributions, created_at, updated_at
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
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
    "2026-01-02T00:00:00.000Z",
    "2026-01-02T00:00:00.000Z",
  );
  db.close();
}

const openStore = () =>
  new EntityStore({ path, now: () => "2026-08-26T00:00:00.000Z" });

describe("migration 5, on a database that already has entities", () => {
  it("is in the list, in order, and does not edit an earlier one", () => {
    const ids = MIGRATIONS.map((m) => m.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(NEW_MIGRATION_ID);
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
    // The assertion this whole file exists for. A `NOT NULL DEFAULT 0` passes
    // "the column exists" and "nothing was lost" and still ships the bug.
    seedAtPreviousMigration();
    openStore().close();

    const db = new DatabaseSync(path);
    const row = db
      .prepare("SELECT is_private_foundation AS v FROM entities WHERE id = ?")
      .get("entity-old-1") as unknown as { v: number | null };
    db.close();

    expect(row.v).toBeNull();
  });

  it("reads that row back with the fact ABSENT, not false", () => {
    // NULL in the column is only half the job. `undefined` and an absent key
    // both read as unknown to the engine, but `false` does not — and `false`
    // is what a careless `?? false` in `toFacts` would produce while the column
    // stayed correctly NULL.
    seedAtPreviousMigration();
    const store = openStore();
    const entity = store.get("entity-old-1");
    store.close();

    expect(entity).toBeDefined();
    expect(entity?.isPrivateFoundation).toBeUndefined();
    expect("isPrivateFoundation" in (entity as object)).toBe(false);
  });

  it("loses nothing that was already there", () => {
    seedAtPreviousMigration();
    const store = openStore();
    const entity = store.get("entity-old-1");
    store.close();

    expect(entity?.name).toBe(BASE_FACTS.name);
    expect(entity?.grossRevenueMinorUnits).toBe(2_000_000);
    expect(entity?.solicitsCharitableContributions).toBe(false);
  });

  it("is idempotent across a reopen", () => {
    // Every start-up runs the migration step. Applying twice must be a no-op,
    // or the second launch after an upgrade fails with "duplicate column".
    seedAtPreviousMigration();
    openStore().close();
    expect(() => openStore().close()).not.toThrow();
  });

  it("applies to a brand-new database too", () => {
    const store = openStore();
    store.close();

    const db = new DatabaseSync(path);
    const columns = (
      db.prepare("PRAGMA table_info(entities)").all() as unknown as {
        name: string;
        notnull: number;
        dflt_value: string | null;
      }[]
    ).filter((c) => c.name === "is_private_foundation");
    db.close();

    expect(columns).toHaveLength(1);
    // Nullable with no default, stated as an assertion rather than left to the
    // SQL being read carefully. Either would silently collapse three states
    // into two.
    expect(columns[0]?.notnull).toBe(0);
    expect(columns[0]?.dflt_value).toBeNull();
  });
});

describe("the three states round-trip through storage", () => {
  it.each([
    ["a private foundation", true],
    ["a public charity", false],
  ] as const)("stores and returns %s", (_label, value) => {
    const store = openStore();
    store.create({ ...BASE_FACTS, isPrivateFoundation: value }, "e1");
    const read = store.get("e1");
    store.close();
    expect(read?.isPrivateFoundation).toBe(value);
  });

  it("stores an unanswered question as unanswered", () => {
    const store = openStore();
    store.create(BASE_FACTS, "e1");
    const read = store.get("e1");
    store.close();
    expect(read?.isPrivateFoundation).toBeUndefined();
  });

  it("lets an answer be taken back", () => {
    // "I clicked the wrong one" has to be recoverable, and it is the case a
    // two-state column cannot express at all: without the third state there is
    // no value that means "ignore what I said". An update that could not clear
    // the field would leave a wrong answer permanently deciding the customer's
    // federal return.
    const store = openStore();
    store.create({ ...BASE_FACTS, isPrivateFoundation: true }, "e1");
    expect(store.get("e1")?.isPrivateFoundation).toBe(true);

    store.update("e1", BASE_FACTS);
    expect(store.get("e1")?.isPrivateFoundation).toBeUndefined();
    store.close();
  });

  it("keeps false distinct from unanswered across an update", () => {
    // The pair to the assertion above. If `update` mapped both to NULL, the
    // clearing test would still pass and a deliberate "no" would silently
    // become "we never asked" — putting the rule back into indeterminate every
    // time the customer edited an unrelated field.
    const store = openStore();
    store.create(BASE_FACTS, "e1");
    store.update("e1", { ...BASE_FACTS, isPrivateFoundation: false });
    expect(store.get("e1")?.isPrivateFoundation).toBe(false);
    store.close();
  });
});
