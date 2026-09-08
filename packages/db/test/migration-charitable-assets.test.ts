/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Migration 7 against a database that already has entities in it.
 *
 * The sibling of `migration-supporting-organization.test.ts`, written the same
 * way for the same reason: against a real file seeded at migration 6, with a
 * real row in it, because the whole question is whether an EXISTING database
 * survives, and an in-memory one has no past.
 *
 * ## What was actually broken, and why no test caught it
 *
 * `charitableAssetsMinorUnits` was on `EntityFacts`, collected by the self-host
 * form, parsed onto the facts object — and held by no column. `create()`
 * accepted it and returned a `StoredEntity` that looked right, because the
 * return value is re-read from the row it had just failed to write the fact
 * into. Nothing threw. The field then read back BLANK on the edit screen, which
 * reads as a failed save rather than a dropped fact, so the natural response is
 * to type it again and lose it again.
 *
 * The visible cost is `us-wa-charitable-trust-registration`, the one rule that
 * conditions on this fact: it could never be decided for a self-hoster, however
 * carefully the form was filled in, and reported as indeterminate forever while
 * asking for a figure the user had already given.
 *
 * ## What is at risk in the migration itself
 *
 * The column is nullable and **NULL is the answer** for every row that predates
 * it. A `NOT NULL DEFAULT 0` would claim every existing organisation holds no
 * charitable assets at all — which reads as a firm "below the line" and turns
 * an honest "we cannot tell yet" into a wrong negative on a registration the
 * Washington Secretary of State does enforce. Under-filing, from a column
 * default, exactly as it would have been one migration earlier.
 *
 * Threshold checked against the primary source rather than against the rule
 * file: WAC 434-120-305 requires registration where a trustee holds assets
 * "invested for income-producing purposes, exceeding a value of two hundred
 * fifty thousand dollars".
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { EntityFacts } from "@optima-compliance/engine";
import { MIGRATIONS } from "../src/schema.js";
import { EntityStore } from "../src/store.js";

const NEW_MIGRATION_ID = 7;

/** Every column this migration adds, and the shape each must have. */
const ADDED_COLUMNS = ["charitable_assets_minor_units"];

let dir: string;
let path: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "optima-migration-ca-"));
  path = join(dir, "test.sqlite");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const BASE_FACTS: EntityFacts = {
  name: "Example Skagit Watershed Endowment",
  entityTypes: ["501c3"],
  formedOn: "2009-04-02",
  homeJurisdiction: "US-WA",
  jurisdictions: ["US", "US-WA"],
  fiscalYearEnd: "12-31",
  grossRevenueMinorUnits: 1_200_000,
  totalAssetsMinorUnits: 90_000_000,
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

  // An entity that predates this column — every entity in every install does.
  // It ANSWERS the two questions added at migration 6, deliberately: exactly
  // one thing is unanswered afterwards, so an assertion about the new column
  // cannot be satisfied by an older one happening to be missing too.
  db.prepare(
    `INSERT INTO entities (
       id, name, entity_types, formed_on, home_jurisdiction, jurisdictions,
       fiscal_year_end, registered_on, gross_revenue_minor_units,
       total_assets_minor_units, employee_count,
       solicits_charitable_contributions, is_private_foundation,
       is_supporting_organization,
       created_at, updated_at
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
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
    0,
    "2026-01-02T00:00:00.000Z",
    "2026-01-02T00:00:00.000Z",
  );
  db.close();
}

const openStore = () =>
  new EntityStore({ path, now: () => "2026-09-08T00:00:00.000Z" });

describe("migration 7, on a database that already has entities", () => {
  it("is appended, not inserted, and edits no earlier migration", () => {
    // "Append only" is the rule a shipped migration lives under: a self-hoster
    // has already run the earlier ones, so an edit changes what new installs
    // get without changing existing ones and the two diverge silently.
    const ids = MIGRATIONS.map((m) => m.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(NEW_MIGRATION_ID);
    // Every migration BEFORE this one is still before it. That is the append-
    // only property, and unlike "this is the newest migration" it stays true
    // when the next one lands.
    expect(ids.filter((id) => id < NEW_MIGRATION_ID)).toEqual(
      ids.slice(0, ids.indexOf(NEW_MIGRATION_ID)),
    );
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

  it("leaves every pre-existing row UNANSWERED, not answered zero", () => {
    // A zero here is not a missing value, it is a claim: "this organisation
    // holds no charitable assets". Read against the $250,000 line that is a
    // firm NO on a registration the state does enforce, from a column default
    // nobody chose.
    seedAtPreviousMigration();
    openStore().close();

    const db = new DatabaseSync(path);
    const row = db
      .prepare("SELECT charitable_assets_minor_units AS v FROM entities WHERE id = ?")
      .get("entity-old-1") as unknown as { v: number | null };
    db.close();

    expect(row.v).toBeNull();
  });

  it("reads that row back with the fact ABSENT, not zero", () => {
    // NULL in the column is only half the job: `0` is what a careless `?? 0` in
    // `toFacts` would produce while the column stayed correct, and the engine
    // tests `=== undefined` to decide a fact is unknown.
    seedAtPreviousMigration();
    const store = openStore();
    const entity = store.get("entity-old-1");
    store.close();

    expect(entity).toBeDefined();
    expect("charitableAssetsMinorUnits" in (entity as object)).toBe(false);
  });

  it("loses nothing that was already there, including the earlier answers", () => {
    seedAtPreviousMigration();
    const store = openStore();
    const entity = store.get("entity-old-1");
    store.close();

    expect(entity?.name).toBe(BASE_FACTS.name);
    expect(entity?.grossRevenueMinorUnits).toBe(1_200_000);
    expect(entity?.totalAssetsMinorUnits).toBe(90_000_000);
    expect(entity?.solicitsCharitableContributions).toBe(false);
    expect(entity?.isPrivateFoundation).toBe(false);
    expect(entity?.isSupportingOrganization).toBe(false);
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

describe("charitable assets round-trip through storage", () => {
  it("stores a figure and returns it unchanged", () => {
    // The assertion this file exists for, and the one nothing had. A
    // write-only check passes against the defect: `create()` returns a
    // `StoredEntity` re-read from the row, so the caller sees a plausible
    // object either way. Only reading the fact back distinguishes a PERSISTED
    // fact from an ACCEPTED one.
    const store = openStore();
    store.create({ ...BASE_FACTS, charitableAssetsMinorUnits: 30_000_000 }, "e1");
    const read = store.get("e1");
    store.close();
    expect(read?.charitableAssetsMinorUnits).toBe(30_000_000);
  });

  it("survives the list projection as well as the single read", () => {
    // `list()` and `get()` share `toFacts`, but the dashboard reads the list
    // and the edit form reads the single row, so a reader that lost the fact in
    // only one of them would look half-fixed.
    const store = openStore();
    store.create({ ...BASE_FACTS, charitableAssetsMinorUnits: 25_000_001 }, "e1");
    const listed = store.list();
    store.close();
    expect(listed).toHaveLength(1);
    expect(listed[0]?.charitableAssetsMinorUnits).toBe(25_000_001);
  });

  it("stores an unanswered question as unanswered", () => {
    const store = openStore();
    store.create(BASE_FACTS, "e1");
    const read = store.get("e1");
    store.close();
    expect(read?.charitableAssetsMinorUnits).toBeUndefined();
  });

  it("survives an update that changes it", () => {
    const store = openStore();
    store.create({ ...BASE_FACTS, charitableAssetsMinorUnits: 25_000_000 }, "e1");
    store.update("e1", { ...BASE_FACTS, charitableAssetsMinorUnits: 25_000_001 });
    expect(store.get("e1")?.charitableAssetsMinorUnits).toBe(25_000_001);
    store.close();
  });

  it("lets an answer be taken back", () => {
    const store = openStore();
    store.create({ ...BASE_FACTS, charitableAssetsMinorUnits: 30_000_000 }, "e1");
    expect(store.get("e1")?.charitableAssetsMinorUnits).toBe(30_000_000);

    store.update("e1", BASE_FACTS);
    expect(store.get("e1")?.charitableAssetsMinorUnits).toBeUndefined();
    store.close();
  });

  it("distinguishes a genuine zero from an unsupplied figure", () => {
    // An organisation really can hold no charitable assets, and that is a
    // different fact from not having told us. Collapsing them is what a
    // `|| null` on a falsy value does, and here it is the difference between
    // "below the line" and "we cannot tell".
    const store = openStore();
    store.create({ ...BASE_FACTS, charitableAssetsMinorUnits: 0 }, "e1");
    const read = store.get("e1");
    store.close();
    expect(read?.charitableAssetsMinorUnits).toBe(0);
  });

  it("keeps charitable assets distinct from total assets", () => {
    // The split is the entire point of the fact: `facts.ts` records that it was
    // separated from `totalAssetsMinorUnits` so an organisation with
    // substantial NON-charitable assets is not over-triggered into
    // registration. A storage layer that wrote one into the other would undo
    // the split while every other assertion here still passed.
    const store = openStore();
    store.create(
      { ...BASE_FACTS, totalAssetsMinorUnits: 90_000_000, charitableAssetsMinorUnits: 10_000_000 },
      "e1",
    );
    const read = store.get("e1");
    store.close();
    expect(read?.totalAssetsMinorUnits).toBe(90_000_000);
    expect(read?.charitableAssetsMinorUnits).toBe(10_000_000);
  });
});
