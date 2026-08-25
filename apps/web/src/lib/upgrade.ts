import "server-only";
/**
 * Carrying a pre-rename install forward.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * The product was called Maximus Compliance until NEH-237, and the rename moved
 * both the environment variables and the database filename. A self-hoster
 * upgrades by pulling a new image onto the same volume, so without this file
 * their next start finds no `OPTIMA_DB_PATH`, defaults to a filename that has
 * never existed, and creates an empty database beside the full one.
 *
 * **That failure looks exactly like total data loss** — the calendar is empty,
 * the entities are gone, and nothing in the logs says why. The old data is still
 * on the volume, but no one would guess that from the screen. Both fallbacks
 * below exist for that one scenario, and both are loud when they fire.
 */

import { basename, dirname, join } from "node:path";
import { existsSync, renameSync } from "node:fs";

/** The pre-rename and post-rename default database filenames. */
const LEGACY_DB_BASENAME = "maximus.sqlite";
const CURRENT_DB_BASENAME = "optima.sqlite";

/**
 * SQLite derives these names from the main database file, so they belong to it
 * and must move with it. A renamed `.sqlite` whose `-wal` was left behind opens
 * clean and is silently missing every write since the last checkpoint — the
 * same trap as the naive backup in NEH-230.
 */
const SIDECAR_SUFFIXES = ["-wal", "-shm"] as const;

/** Injected so the tests can exercise this without touching a real volume. */
export interface FileOps {
  exists(path: string): boolean;
  rename(from: string, to: string): void;
}

const nodeFileOps: FileOps = {
  exists: existsSync,
  rename: renameSync,
};

/** Warn once per variable, not once per read — `getStore()` is called per request. */
const warned = new Set<string>();

/**
 * Read a renamed environment variable, honouring the name it had before.
 *
 * Pass the suffix (`"DB_PATH"`), not the whole name. The current `OPTIMA_` name
 * always wins, so an operator who has migrated never sees the warning and can
 * set both during a rollout without ambiguity.
 */
export function renamedEnv(
  suffix: string,
  // A string dictionary, not `NodeJS.ProcessEnv`. Next augments that interface
  // with a REQUIRED `NODE_ENV`, so every caller passing a literal had to carry
  // a variable this function never reads — and the five that did not were
  // errors nothing gated (NEH-1174). `process.env` still satisfies this.
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  const current = env[`OPTIMA_${suffix}`];
  if (current !== undefined) return current;

  const legacy = env[`MAXIMUS_${suffix}`];
  if (legacy === undefined) return undefined;

  if (!warned.has(suffix)) {
    warned.add(suffix);
    console.warn(
      `[optima] MAXIMUS_${suffix} is the pre-rename name and will be removed. ` +
        `Rename it to OPTIMA_${suffix}.`,
    );
  }
  return legacy;
}

/**
 * Move a pre-rename database into place, and report the path to open.
 *
 * Only fires for the **default** filename: an operator who set an explicit path
 * keeps whatever they named, and `renamedEnv` above is what carries their
 * setting across. Doing otherwise would rename a file they chose.
 *
 * Deliberately **not** guarded with a try/catch. If the volume is read-only the
 * rename fails, and crashing on startup with a real error is far better than
 * continuing into an empty database — the exact outcome this exists to prevent.
 *
 * Sidecars move first and the main file last, so the main file's presence stays
 * an honest "already migrated" marker. A partial move retries cleanly on the
 * next start rather than being mistaken for a finished one.
 */
export function adoptLegacyDatabase(path: string, ops: FileOps = nodeFileOps): string {
  if (path === ":memory:") return path;
  if (basename(path) !== CURRENT_DB_BASENAME) return path;
  if (ops.exists(path)) return path;

  const legacy = join(dirname(path), LEGACY_DB_BASENAME);
  if (!ops.exists(legacy)) return path;

  for (const suffix of SIDECAR_SUFFIXES) {
    if (ops.exists(legacy + suffix)) ops.rename(legacy + suffix, path + suffix);
  }
  ops.rename(legacy, path);

  console.info(`[optima] migrated database ${legacy} -> ${path} (product rename)`);
  return path;
}
