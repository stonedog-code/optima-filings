/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Migration 8 against a database that already has entities in it.
 *
 * The sibling of `migration-charitable-assets.test.ts`, written the same way
 * for the same reason: against a real file seeded at migration 7, with a real
 * row in it, because the whole question is whether an EXISTING database
 * survives, and an in-memory one has no past.
 *
 * ## What this migration is for
 *
 * Two Washington rules were each testing a fact that was *near* what their
 * regulation names, because the model had nothing nearer.
 *
 * - **RCW 19.09.081(1)** exempts a charity "raising less than fifty thousand
 *   dollars in any accounting year when all the activities of the organization,
 *   including all fund-raising activities, are carried on by persons who are
 *   unpaid for their services and no part of the charitable organization's
 *   assets or income inures to the benefit of or is paid to any officer,
 *   director, member, or trustee". Three columns, one per limb, because the
 *   exemption is conjunctive and a missing limb makes the exemption we
 *   implement broader than the statute's.
 * - **WAC 434-120-305** reaches assets "invested for income-producing
 *   purposes", not every asset held for charitable purposes. One column, and
 *   deliberately NOT a redefinition of `charitable_assets_minor_units`, which
 *   migration 7 added one migration ago and which self-hosters have already
 *   answered.
 *
 * ## What is at risk in the migration itself
 *
 * All four columns are nullable and **NULL is the answer** for every row that
 * predates them — the fourth migration running where that is the load-bearing
 * decision. The two booleans are the interesting case, because unlike every
 * earlier one BOTH defaults are harmful and in opposite directions:
 *
 * - `all_fundraising_unpaid NOT NULL DEFAULT 0` denies the exemption to every
 *   organisation already in every database. Over-filing: a small volunteer-run
 *   charity keeps being told to register and pay $40 it does not owe, which is
 *   the exact defect this migration exists to remove.
 * - `... DEFAULT 1` grants the exemption to all of them. Under-filing, on no
 *   evidence, which is worse.
 *
 * There is no safe default, which is the clearest case yet for the third state.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { EntityFacts } from "@optima-compliance/engine";
import { MIGRATIONS } from "../src/schema.js";
import { EntityStore } from "../src/store.js";

const NEW_MIGRATION_ID = 8;

/** Every column this migration adds. */
const ADDED_COLUMNS = [
  "contributions_raised_minor_units",
  "all_fundraising_unpaid",
  "assets_or_income_inure_to_insiders",
  "income_producing_charitable_assets_minor_units",
];

/** The two of them that carry a yes / no / unasked answer. */
const ADDED_TRISTATE_COLUMNS: readonly (keyof EntityFacts)[] = [
  "allFundraisingUnpaid",
  "assetsOrIncomeInureToInsiders",
];

let dir: string;
let path: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "optima-migration-wa8-"));
  path = join(dir, "test.sqlite");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const BASE_FACTS: EntityFacts = {
  name: "Example Nisqually Trailkeepers",
  entityTypes: ["501c3"],
  formedOn: "2017-04-11",
  homeJurisdiction: "US-WA",
  jurisdictions: ["US", "US-WA"],
  fiscalYearEnd: "12-31",
  grossRevenueMinorUnits: 3_150_000,
  totalAssetsMinorUnits: 4_000_000,
  solicitsCharitableContributions: true,
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

  // An entity that predates these columns — every entity in every install
  // does. It ANSWERS everything added at migrations 5, 6 and 7, deliberately:
  // exactly the four new facts are unanswered afterwards, so an assertion about
  // a new column cannot be satisfied by an older one happening to be missing
  // too. `charitable_assets_minor_units` in particular is filled in, because
  // this migration's whole claim is that the BROAD figure is kept and is not
  // reused as the narrow one.
  db.prepare(
    `INSERT INTO entities (
       id, name, entity_types, formed_on, home_jurisdiction, jurisdictions,
       fiscal_year_end, registered_on, gross_revenue_minor_units,
       total_assets_minor_units, charitable_assets_minor_units, employee_count,
       solicits_charitable_contributions, is_private_foundation,
       is_supporting_organization,
       created_at, updated_at
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
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
    415_000_000,
    null,
    1,
    0,
    0,
    "2026-01-02T00:00:00.000Z",
    "2026-01-02T00:00:00.000Z",
  );
  db.close();
}

const openStore = () =>
  new EntityStore({ path, now: () => "2026-09-09T00:00:00.000Z" });

describe("migration 8, on a database that already has entities", () => {
  it("is appended, not inserted, and edits no earlier migration", () => {
    const ids = MIGRATIONS.map((m) => m.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(NEW_MIGRATION_ID);
    // Every migration BEFORE this one is still before it — the append-only
    // property, which unlike "this is the newest" stays true when 9 lands.
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

  it.each(ADDED_COLUMNS)("leaves %s NULL on every pre-existing row", (name) => {
    seedAtPreviousMigration();
    openStore().close();

    const db = new DatabaseSync(path);
    const row = db
      .prepare(`SELECT ${name} AS v FROM entities WHERE id = ?`)
      .get("entity-old-1") as unknown as { v: number | null };
    db.close();

    expect(row.v).toBeNull();
  });

  it("reads those rows back with the facts ABSENT, not zero and not false", () => {
    // NULL in the column is only half the job: a careless `?? 0` or `=== 1` in
    // `toFacts` would produce `0` / `false` while the column stayed correct,
    // and the engine tests `=== undefined` to decide a fact is unknown.
    seedAtPreviousMigration();
    const store = openStore();
    const entity = store.get("entity-old-1");
    store.close();

    expect(entity).toBeDefined();
    for (const key of [
      "contributionsRaisedMinorUnits",
      "allFundraisingUnpaid",
      "assetsOrIncomeInureToInsiders",
      "incomeProducingCharitableAssetsMinorUnits",
    ]) {
      expect(key in (entity as object)).toBe(false);
    }
  });

  it("KEEPS the broad charitable-assets answer and does not reuse it", () => {
    // The one thing this migration could get wrong that would look like a
    // kindness: back-filling the new narrow column from the old broad one. The
    // two differ for exactly the organisations the distinction was drawn for —
    // a land trust holding $4.15M of easements holds $0 invested for income —
    // so a back-fill would silently re-assert the over-trigger this migration
    // removes, on data the user never gave.
    seedAtPreviousMigration();
    const store = openStore();
    const entity = store.get("entity-old-1");
    store.close();

    expect(entity?.charitableAssetsMinorUnits).toBe(415_000_000);
    expect("incomeProducingCharitableAssetsMinorUnits" in (entity as object)).toBe(
      false,
    );
  });

  it("loses nothing that was already there", () => {
    seedAtPreviousMigration();
    const store = openStore();
    const entity = store.get("entity-old-1");
    store.close();

    expect(entity?.name).toBe(BASE_FACTS.name);
    expect(entity?.grossRevenueMinorUnits).toBe(3_150_000);
    expect(entity?.totalAssetsMinorUnits).toBe(4_000_000);
    expect(entity?.solicitsCharitableContributions).toBe(true);
    expect(entity?.isPrivateFoundation).toBe(false);
    expect(entity?.isSupportingOrganization).toBe(false);
  });
});

describe("the four new facts round-trip through storage", () => {
  it("stores every one of them and returns each unchanged", () => {
    // A write-only check passes against the migration-7 defect: `create()`
    // returns a `StoredEntity` re-read from the row, so the caller sees a
    // plausible object whether or not the column exists. Only reading the fact
    // back distinguishes a PERSISTED fact from an ACCEPTED one.
    const store = openStore();
    store.create(
      {
        ...BASE_FACTS,
        contributionsRaisedMinorUnits: 3_150_000,
        allFundraisingUnpaid: true,
        assetsOrIncomeInureToInsiders: false,
        incomeProducingCharitableAssetsMinorUnits: 31_000_000,
      },
      "e1",
    );
    const read = store.get("e1");
    store.close();

    expect(read?.contributionsRaisedMinorUnits).toBe(3_150_000);
    expect(read?.allFundraisingUnpaid).toBe(true);
    expect(read?.assetsOrIncomeInureToInsiders).toBe(false);
    expect(read?.incomeProducingCharitableAssetsMinorUnits).toBe(31_000_000);
  });

  it("survives the list projection as well as the single read", () => {
    // `list()` and `get()` share `toFacts`, but the dashboard reads the list
    // and the edit form reads the single row, so a reader that lost a fact in
    // only one of them would look half-fixed.
    const store = openStore();
    store.create(
      { ...BASE_FACTS, contributionsRaisedMinorUnits: 4_999_999, allFundraisingUnpaid: true },
      "e1",
    );
    const listed = store.list();
    store.close();

    expect(listed).toHaveLength(1);
    expect(listed[0]?.contributionsRaisedMinorUnits).toBe(4_999_999);
    expect(listed[0]?.allFundraisingUnpaid).toBe(true);
  });

  it.each(ADDED_TRISTATE_COLUMNS)("keeps %s as three states, not two", (key) => {
    // yes / no / nobody has been asked. A boolean column that folded the third
    // into either of the others is the whole hazard this migration is written
    // around, and it folds SILENTLY.
    const store = openStore();
    store.create({ ...BASE_FACTS, [key]: true }, "yes");
    store.create({ ...BASE_FACTS, [key]: false }, "no");
    store.create(BASE_FACTS, "unasked");

    expect(store.get("yes")?.[key]).toBe(true);
    expect(store.get("no")?.[key]).toBe(false);
    expect(store.get("unasked")?.[key]).toBeUndefined();
    expect(key in (store.get("unasked") as object)).toBe(false);
    store.close();
  });

  it.each(ADDED_TRISTATE_COLUMNS)("lets a %s answer be taken back", (key) => {
    // An UPDATE that omits a column leaves the previous value in place, so
    // "no" would be unretractable. That pairing is what migration 7's fix was
    // about, and it is repeated here rather than assumed.
    const store = openStore();
    store.create({ ...BASE_FACTS, [key]: true }, "e1");
    expect(store.get("e1")?.[key]).toBe(true);

    store.update("e1", BASE_FACTS);
    expect(store.get("e1")?.[key]).toBeUndefined();
    store.close();
  });

  it("distinguishes raising NOTHING from not having said", () => {
    // A real answer, and a consequential one: $0 is below the $50,000 line, so
    // it helps GRANT the exemption. Reading "unasked" as 0 would exempt every
    // organisation that never filled the field in.
    const store = openStore();
    store.create({ ...BASE_FACTS, contributionsRaisedMinorUnits: 0 }, "zero");
    store.create(BASE_FACTS, "unasked");

    expect(store.get("zero")?.contributionsRaisedMinorUnits).toBe(0);
    expect(store.get("unasked")?.contributionsRaisedMinorUnits).toBeUndefined();
    store.close();
  });

  it("distinguishes holding NOTHING invested from not having said", () => {
    // The same distinction on the trust side, and the direction is opposite: a
    // real 0 means the organisation does NOT register, which is a decided
    // answer, while unasked must stay undecided.
    const store = openStore();
    store.create(
      { ...BASE_FACTS, incomeProducingCharitableAssetsMinorUnits: 0 },
      "zero",
    );
    store.create(BASE_FACTS, "unasked");

    expect(store.get("zero")?.incomeProducingCharitableAssetsMinorUnits).toBe(0);
    expect(
      store.get("unasked")?.incomeProducingCharitableAssetsMinorUnits,
    ).toBeUndefined();
    store.close();
  });

  it("keeps the two asset figures, and the two money figures, distinct", () => {
    // Four numbers, two near-synonymous pairs, one row. A storage layer that
    // wrote either of a pair into the other would undo the split at the layer
    // furthest from anyone who would notice, while every other assertion here
    // still passed. All four values are different so no swap can hide.
    const store = openStore();
    store.create(
      {
        ...BASE_FACTS,
        grossRevenueMinorUnits: 51_000_000,
        contributionsRaisedMinorUnits: 3_150_000,
        charitableAssetsMinorUnits: 415_000_000,
        incomeProducingCharitableAssetsMinorUnits: 31_000_000,
      },
      "e1",
    );
    const read = store.get("e1");
    store.close();

    expect(read?.grossRevenueMinorUnits).toBe(51_000_000);
    expect(read?.contributionsRaisedMinorUnits).toBe(3_150_000);
    expect(read?.charitableAssetsMinorUnits).toBe(415_000_000);
    expect(read?.incomeProducingCharitableAssetsMinorUnits).toBe(31_000_000);
  });
});
