import "server-only";
/**
 * The server boundary.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * **This is the only file in the app that reads the clock, touches the
 * filesystem, or opens the database.** Everything below it — the engine, the
 * export package, the store's own logic — is pure and takes what it needs as an
 * argument. Keeping the impure surface to one file is what makes the rest
 * testable, and `import "server-only"` makes it a build error to pull any of it
 * into a client component.
 */

import { EntityStore, type StoredEntity } from "@optima-compliance/db";
import { evaluate, type EvaluationResult, type Rule } from "@optima-compliance/engine";
import { allRules } from "./local-rules";
import { adoptLegacyDatabase, renamedEnv } from "./upgrade";

/**
 * Where the SQLite file lives.
 *
 * Defaults inside `/data`, which is the documented volume mount. A self-hoster
 * who forgets `-v` gets a database inside the container that vanishes on the
 * next `docker run` — so the startup log says the path out loud rather than
 * letting the loss be discovered later.
 *
 * Resolved through `renamedEnv`/`adoptLegacyDatabase` so an install predating
 * the Optima Filings rename keeps its data; see `upgrade.ts`.
 */
const DB_PATH = renamedEnv("DB_PATH") ?? "/data/optima.sqlite";

/**
 * One store for the process.
 *
 * Cached on `globalThis` rather than in a module-level `let`, because Next's
 * dev server re-evaluates modules on every hot reload — a plain module variable
 * leaks a new SQLite handle per edit until the process runs out of them.
 */
const globalForStore = globalThis as unknown as { optimaStore?: EntityStore };

export function getStore(): EntityStore {
  if (!globalForStore.optimaStore) {
    // Before the file is opened, never after: opening creates it, and a created
    // file would make the pre-rename database invisible from then on.
    const path = adoptLegacyDatabase(DB_PATH);
    globalForStore.optimaStore = new EntityStore({
      path,
      now: () => new Date().toISOString(),
    });
    if (process.env.NODE_ENV !== "test") {
      console.info(`[optima] database: ${DB_PATH}`);
      // Registered here rather than at module load: this is the moment a
      // database handle actually exists to be checkpointed.
      void import("./shutdown").then((m) => m.wireShutdown());
    }
  }
  return globalForStore.optimaStore;
}

/** Today, UTC, as `YYYY-MM-DD`. The app's single clock read. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Whether to show rules a human has not verified against their statute.
 *
 * **Defaults to off**, matching the engine. Turning it on is a deliberate act,
 * and every draft row is marked in the UI.
 *
 * It mattered more than it does. When the whole seed set was `draft`, off meant
 * an empty calendar for anyone who had not opted in — the honest answer, not a
 * bug. Since pack `2026.8.6` the shipped set is entirely `active`, so this flag
 * only affects rules the operator added themselves — which they do through
 * `OPTIMA_RULES_DIR`; see `local-rules.ts`.
 */
export function includeDraft(): boolean {
  return renamedEnv("INCLUDE_DRAFT") === "true";
}

export interface EntityCalendar {
  entity: StoredEntity;
  result: EvaluationResult;
}

/**
 * `rules` is a parameter so a page with several entities resolves the pack ONCE.
 *
 * `allRules()` reads `OPTIMA_RULES_DIR` off the disk on every call (see
 * `local-rules.ts` — that is what lets a rule author edit a file and reload
 * rather than restart). Calling it per entity would turn one directory read
 * into one per row, and the default keeps every existing caller correct.
 */
export function calendarFor(
  entity: StoredEntity,
  asOf: string,
  horizonMonths = 12,
  rules: readonly Rule[] = allRules(),
): EntityCalendar {
  return {
    entity,
    result: evaluate(entity, rules, {
      asOf,
      horizonMonths,
      includeDraft: includeDraft(),
    }),
  };
}

/** Every entity's calendar, for the overview. */
export function allCalendars(asOf: string, horizonMonths = 12): EntityCalendar[] {
  const rules = allRules();
  return getStore()
    .list()
    .map((entity) => calendarFor(entity, asOf, horizonMonths, rules));
}
