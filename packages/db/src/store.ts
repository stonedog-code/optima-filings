/**
 * Entity persistence.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { DatabaseSync } from "node:sqlite";
import type { EntityFacts, EntityType, Jurisdiction } from "@optima-compliance/engine";
import { MIGRATIONS } from "./schema.js";
import { DocumentStore } from "./documents.js";

/** A stored entity: the engine's facts plus the columns storage adds. */
export interface StoredEntity extends EntityFacts {
  id: string;
  createdAt: string;
  updatedAt: string;
}

interface EntityRow {
  id: string;
  name: string;
  entity_types: string;
  formed_on: string;
  home_jurisdiction: string;
  jurisdictions: string;
  fiscal_year_end: string;
  registered_on: string | null;
  gross_revenue_minor_units: number | null;
  total_assets_minor_units: number | null;
  employee_count: number | null;
  solicits_charitable_contributions: number | null;
  is_private_foundation: number | null;
  is_supporting_organization: number | null;
  gross_revenue_prior_year_1_minor_units: number | null;
  gross_revenue_prior_year_2_minor_units: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Convert a row back to facts.
 *
 * **`null` becomes an absent key, not `undefined` or `0`.** The engine tests
 * `=== undefined` to decide whether a fact is unknown, and an explicit
 * `grossRevenueMinorUnits: undefined` would also read as unknown — but a `0`
 * would read as "this organisation earned nothing", which is a different and
 * wrong answer. Omitting the key keeps the round trip lossless.
 */
function toFacts(row: EntityRow): StoredEntity {
  const optional = <T,>(value: T | null): Record<string, never> | { v: T } =>
    value === null ? ({} as Record<string, never>) : { v: value };

  return {
    id: row.id,
    name: row.name,
    entityTypes: JSON.parse(row.entity_types) as EntityType[],
    formedOn: row.formed_on,
    homeJurisdiction: row.home_jurisdiction,
    jurisdictions: JSON.parse(row.jurisdictions) as Jurisdiction[],
    fiscalYearEnd: row.fiscal_year_end,
    ...(row.registered_on
      ? { registeredOn: JSON.parse(row.registered_on) as Record<string, string> }
      : {}),
    ...("v" in optional(row.gross_revenue_minor_units)
      ? { grossRevenueMinorUnits: row.gross_revenue_minor_units as number }
      : {}),
    ...("v" in optional(row.total_assets_minor_units)
      ? { totalAssetsMinorUnits: row.total_assets_minor_units as number }
      : {}),
    ...("v" in optional(row.employee_count)
      ? { employeeCount: row.employee_count as number }
      : {}),
    ...(row.solicits_charitable_contributions === null
      ? {}
      : {
          solicitsCharitableContributions:
            row.solicits_charitable_contributions === 1,
        }),
    // Three states, and all three survive the round trip: 1 and 0 become
    // `true` and `false`, and NULL becomes an ABSENT KEY. The engine tests
    // `=== undefined` to decide a fact is unknown, so an absent key is what
    // makes an unanswered foundation question report the 990 family as
    // indeterminate instead of deciding it.
    ...(row.is_private_foundation === null
      ? {}
      : { isPrivateFoundation: row.is_private_foundation === 1 }),
    // The same three states again, for the same reason. A supporting
    // organisation may not file the 990-N e-Postcard at any size, so an
    // unanswered question read as "no" is under-filing.
    ...(row.is_supporting_organization === null
      ? {}
      : { isSupportingOrganization: row.is_supporting_organization === 1 }),
    ...("v" in optional(row.gross_revenue_prior_year_1_minor_units)
      ? {
          grossRevenuePriorYear1MinorUnits:
            row.gross_revenue_prior_year_1_minor_units as number,
        }
      : {}),
    ...("v" in optional(row.gross_revenue_prior_year_2_minor_units)
      ? {
          grossRevenuePriorYear2MinorUnits:
            row.gross_revenue_prior_year_2_minor_units as number,
        }
      : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface OpenOptions {
  /** File path, or `":memory:"`. */
  path: string;
  /**
   * Timestamp for `createdAt`/`updatedAt`, as an ISO string.
   *
   * Supplied by the caller for the same reason the engine takes `asOf`: a store
   * that reads the clock cannot be tested deterministically. The app passes the
   * real time at its own boundary.
   */
  now: () => string;
  /**
   * Id generator for rows this store creates on the caller's behalf, such as a
   * document's reference fields. Injectable so a test can make them predictable.
   */
  newId?: () => string;
}

export class EntityStore {
  private readonly db: DatabaseSync;
  private readonly now: () => string;

  /**
   * Documents and user-authored actions.
   *
   * Shares this connection deliberately: SQLite allows one writer, and a second
   * handle to the same file would deadlock under WAL rather than fail cleanly.
   */
  readonly documents: DocumentStore;

  constructor(options: OpenOptions) {
    this.db = new DatabaseSync(options.path);
    this.now = options.now;
    // Foreign keys off by default in SQLite, and WAL is the right journal for a
    // long-lived server process. Both must be set per connection, not once.
    this.db.exec("PRAGMA foreign_keys = ON");
    if (options.path !== ":memory:") this.db.exec("PRAGMA journal_mode = WAL");
    this.migrate();
    this.documents = new DocumentStore(
      this.db,
      options.now,
      options.newId ?? (() => globalThis.crypto.randomUUID()),
    );
  }

  /**
   * Apply any migration this database has not seen.
   *
   * Runs on every open rather than behind a CLI step, because a self-hoster
   * upgrades by pulling a new image and restarting — there is no migration
   * command in that workflow, and an un-migrated database would fail at the
   * first query with an error that says nothing useful.
   */
  private migrate(): void {
    this.db.exec(
      "CREATE TABLE IF NOT EXISTS migrations (id INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)",
    );
    const applied = new Set(
      (
        this.db.prepare("SELECT id FROM migrations").all() as unknown as {
          id: number;
        }[]
      ).map((row) => row.id),
    );

    for (const migration of MIGRATIONS) {
      if (applied.has(migration.id)) continue;
      this.db.exec("BEGIN");
      try {
        this.db.exec(migration.sql);
        this.db
          .prepare("INSERT INTO migrations (id, name, applied_at) VALUES (?, ?, ?)")
          .run(migration.id, migration.name, this.now());
        this.db.exec("COMMIT");
      } catch (error) {
        this.db.exec("ROLLBACK");
        throw new Error(
          `Migration ${migration.id} (${migration.name}) failed: ${(error as Error).message}`,
          { cause: error },
        );
      }
    }
  }

  create(facts: EntityFacts, id: string): StoredEntity {
    const timestamp = this.now();
    this.db
      .prepare(
        `INSERT INTO entities (
           id, name, entity_types, formed_on, home_jurisdiction, jurisdictions,
           fiscal_year_end, registered_on, gross_revenue_minor_units,
           total_assets_minor_units, employee_count,
           solicits_charitable_contributions, is_private_foundation,
           is_supporting_organization,
           gross_revenue_prior_year_1_minor_units,
           gross_revenue_prior_year_2_minor_units,
           created_at, updated_at
         ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        id,
        facts.name,
        JSON.stringify(facts.entityTypes),
        facts.formedOn,
        facts.homeJurisdiction,
        JSON.stringify(facts.jurisdictions),
        facts.fiscalYearEnd,
        facts.registeredOn ? JSON.stringify(facts.registeredOn) : null,
        facts.grossRevenueMinorUnits ?? null,
        facts.totalAssetsMinorUnits ?? null,
        facts.employeeCount ?? null,
        facts.solicitsCharitableContributions === undefined
          ? null
          : facts.solicitsCharitableContributions
            ? 1
            : 0,
        facts.isPrivateFoundation === undefined
          ? null
          : facts.isPrivateFoundation
            ? 1
            : 0,
        facts.isSupportingOrganization === undefined
          ? null
          : facts.isSupportingOrganization
            ? 1
            : 0,
        facts.grossRevenuePriorYear1MinorUnits ?? null,
        facts.grossRevenuePriorYear2MinorUnits ?? null,
        timestamp,
        timestamp,
      );
    return this.get(id)!;
  }

  get(id: string): StoredEntity | undefined {
    // `node:sqlite` types every row as Record<string, SQLOutputValue>, which
    // does not structurally overlap our row shape, so the cast goes via
    // `unknown`. The schema is the actual guarantee here — see schema.ts — and
    // the round-trip tests are what verify it.
    const row = this.db
      .prepare("SELECT * FROM entities WHERE id = ?")
      .get(id) as unknown as EntityRow | undefined;
    return row ? toFacts(row) : undefined;
  }

  list(): StoredEntity[] {
    return (
      this.db
        .prepare("SELECT * FROM entities ORDER BY name COLLATE NOCASE")
        .all() as unknown as EntityRow[]
    ).map(toFacts);
  }

  update(id: string, facts: EntityFacts): StoredEntity | undefined {
    if (!this.get(id)) return undefined;
    this.db
      .prepare(
        `UPDATE entities SET
           name = ?, entity_types = ?, formed_on = ?, home_jurisdiction = ?,
           jurisdictions = ?, fiscal_year_end = ?, registered_on = ?,
           gross_revenue_minor_units = ?, total_assets_minor_units = ?,
           employee_count = ?, solicits_charitable_contributions = ?,
           is_private_foundation = ?,
           is_supporting_organization = ?,
           gross_revenue_prior_year_1_minor_units = ?,
           gross_revenue_prior_year_2_minor_units = ?,
           updated_at = ?
         WHERE id = ?`,
      )
      .run(
        facts.name,
        JSON.stringify(facts.entityTypes),
        facts.formedOn,
        facts.homeJurisdiction,
        JSON.stringify(facts.jurisdictions),
        facts.fiscalYearEnd,
        facts.registeredOn ? JSON.stringify(facts.registeredOn) : null,
        facts.grossRevenueMinorUnits ?? null,
        facts.totalAssetsMinorUnits ?? null,
        facts.employeeCount ?? null,
        facts.solicitsCharitableContributions === undefined
          ? null
          : facts.solicitsCharitableContributions
            ? 1
            : 0,
        facts.isPrivateFoundation === undefined
          ? null
          : facts.isPrivateFoundation
            ? 1
            : 0,
        facts.isSupportingOrganization === undefined
          ? null
          : facts.isSupportingOrganization
            ? 1
            : 0,
        facts.grossRevenuePriorYear1MinorUnits ?? null,
        facts.grossRevenuePriorYear2MinorUnits ?? null,
        this.now(),
        id,
      );
    return this.get(id);
  }

  delete(id: string): boolean {
    const result = this.db.prepare("DELETE FROM entities WHERE id = ?").run(id);
    return result.changes > 0;
  }

  /**
   * Fold the write-ahead log back into the main database file.
   *
   * WAL mode keeps recent writes in `optima.sqlite-wal` until SQLite decides
   * to checkpoint. That is right for a running server and a trap for a
   * self-hoster: copying `optima.sqlite` — the obvious backup instinct —
   * yields a file that **opens cleanly and is silently missing everything
   * recent**. A backup that looks like it worked is worse than none, because
   * the discovery happens during a restore.
   *
   * TRUNCATE rather than PASSIVE: PASSIVE gives up if a reader is active, and
   * "usually checkpoints" is not a property a backup can rely on.
   */
  checkpoint(): void {
    this.db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
  }

  close(): void {
    // Always checkpoint on the way out, so a stopped container leaves a
    // complete .sqlite file behind and the naive copy is correct.
    try {
      this.checkpoint();
    } catch {
      // A checkpoint failure must not stop the handle being released — the
      // data is still safe in the WAL, and refusing to close would be worse.
    }
    this.db.close();
  }
}
