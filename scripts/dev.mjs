#!/usr/bin/env node
/**
 * `npm run dev` — the one way to start the self-host dashboard locally.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * ## Why a script and not `"dev": "npm run dev -w @optima-compliance/web"`
 *
 * The workspace already has a `dev` script, and it does not work on a fresh
 * clone. `apps/web/src/lib/server.ts` defaults the database to
 * `/data/optima.sqlite` — the path a self-hoster's Docker volume is mounted at,
 * and a directory that does not exist on a development machine and cannot be
 * created without root. So the honest container default is exactly the wrong
 * default for a contributor, and the first run dies opening SQLite.
 *
 * The fix is not to change that default: `/data` is right for the artefact
 * people run. It is for the dev entry point to supply the two settings a local
 * run needs, which is what this file does.
 *
 * ## The two settings, and why each is defaulted
 *
 * - `OPTIMA_DB_PATH` → `<repo>/data/optima.sqlite`. Inside the checkout, so it
 *   is obvious where it went and deleting it is a `rm -rf data`. `data/`,
 *   `*.sqlite` and the derived `data/documents/` are all already gitignored —
 *   a self-hoster's database must never be committable to a public repo.
 *
 * - `OPTIMA_INCLUDE_DRAFT` → `true`. The whole seed rule set is
 *   `status: "draft"` and `evaluate()` excludes drafts by default, so a stock
 *   launch renders an empty calendar. That is the correct default for a real
 *   install and a terrible one for someone checking whether their change
 *   worked: an empty screen reads as "the app is broken". The E2E harness opts
 *   in for the same reason (`apps/web/playwright.config.ts`), and every such
 *   row is badged *unverified* in the UI, so nothing here presents draft data
 *   as fact.
 *
 * **Neither default overrides an explicit one.** An operator who exports either
 * variable gets what they asked for, and the startup banner prints the values
 * actually in force — a dev entry point that silently disagreed with the
 * environment would be a worse problem than the one it solves.
 *
 * Extra arguments are forwarded to `next dev`, so `npm run dev -- --port 4000`
 * works.
 */

import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Where a local run keeps its database, unless told otherwise. */
export const DEFAULT_DEV_DB_PATH = join("data", "optima.sqlite");

/**
 * The environment a local dashboard needs, given the one it was started with.
 *
 * Pure and exported so the contract is testable without launching Next: it
 * returns only the variables this script decides, never the whole environment.
 */
export function resolveDevEnv(env = process.env, repoRoot = REPO_ROOT) {
  return {
    OPTIMA_DB_PATH: env.OPTIMA_DB_PATH ?? join(repoRoot, DEFAULT_DEV_DB_PATH),
    OPTIMA_INCLUDE_DRAFT: env.OPTIMA_INCLUDE_DRAFT ?? "true",
  };
}

function main(argv) {
  const devEnv = resolveDevEnv();

  // `--print-env` reports what a run would use and starts nothing. It is what
  // the test asserts against, and it answers "which database am I about to
  // write to" without the side effect of finding out.
  if (argv.includes("--print-env")) {
    process.stdout.write(JSON.stringify(devEnv) + "\n");
    return;
  }

  // Next opens the database on the first request, not at boot, so a missing
  // directory would surface as a 500 in the browser rather than as an error
  // here. Create it up front.
  mkdirSync(dirname(devEnv.OPTIMA_DB_PATH), { recursive: true });

  console.info(`[optima] database:      ${devEnv.OPTIMA_DB_PATH}`);
  console.info(`[optima] include draft: ${devEnv.OPTIMA_INCLUDE_DRAFT}`);

  const child = spawn(
    "npm",
    ["run", "dev", "--workspace=@optima-compliance/web", "--", ...argv],
    {
      cwd: REPO_ROOT,
      stdio: "inherit",
      env: { ...process.env, ...devEnv },
    },
  );

  // Forward the child's fate rather than reporting our own. A dev server that
  // failed to start must not exit 0.
  child.on("exit", (code, signal) => {
    process.exit(signal ? 1 : (code ?? 1));
  });
}

// Only when run, never when imported by a test.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
