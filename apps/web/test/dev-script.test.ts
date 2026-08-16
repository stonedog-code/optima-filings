/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * `npm run dev` is the one way to start the dashboard, and it has to work
 * (NEH-807).
 *
 * The repo had no root `dev` at all, so starting the self-host dashboard meant
 * knowing the workspace name *and* that `apps/web/src/lib/server.ts` defaults
 * the database to `/data/optima.sqlite` — a Docker mount point that does not
 * exist on a development machine. A contributor who guessed `npm run dev
 * --workspace=@optima-compliance/web` got a SQLite open failure and no hint
 * that the fix was an environment variable.
 *
 * Two failures this pins, and they are different:
 *
 * - **The script stops working.** Asserted by RUNNING it (`--print-env`)
 *   rather than by reading `package.json`. A test that only checked the script
 *   existed would stay green through a rename of `OPTIMA_DB_PATH`, which is
 *   exactly the change that breaks a local run silently — the app falls back to
 *   `/data` and the error names SQLite, not the variable.
 * - **The docs drift from it.** A contributor guide naming a different command
 *   is the whole reason NEH-807 exists, so README and CONTRIBUTING are checked
 *   too. Documentation is the surface this rule is really about.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/** Tests compile to CommonJS (see `tsconfig.test.json`), so `__dirname` exists. */
const REPO_ROOT = resolve(__dirname, "..", "..", "..");

function read(relative: string): string {
  return readFileSync(join(REPO_ROOT, relative), "utf8");
}

const rootPackage = JSON.parse(read("package.json")) as {
  scripts: Record<string, string>;
};

/**
 * Run the launcher's reporting mode with the `OPTIMA_*` variables stripped.
 *
 * Inheriting them would make the result depend on the shell the suite was
 * started from: a maintainer who exports `OPTIMA_DB_PATH` for their own use
 * would see the default assertions pass against their value.
 */
function printEnv(overrides: Record<string, string> = {}): Record<string, string> {
  const env: Record<string, string | undefined> = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.startsWith("OPTIMA_")) delete env[key];
  }
  const stdout = execFileSync("node", ["scripts/dev.mjs", "--print-env"], {
    cwd: REPO_ROOT,
    env: { ...env, ...overrides } as NodeJS.ProcessEnv,
    encoding: "utf8",
  });
  return JSON.parse(stdout) as Record<string, string>;
}

describe("npm run dev starts the dashboard (NEH-807)", () => {
  it("exists at the repository root and delegates to the launcher", () => {
    // The root is where a contributor arrives. A `dev` that lived only in
    // apps/web would leave the top-level question unanswered.
    expect(rootPackage.scripts.dev).toBe("node scripts/dev.mjs");
  });

  it("defaults the database inside the checkout, not the container mount", () => {
    const { OPTIMA_DB_PATH } = printEnv();
    expect(OPTIMA_DB_PATH).toBe(join(REPO_ROOT, "data", "optima.sqlite"));
    // The bug in one line: `/data` is correct for the image and unopenable
    // here, and nothing about the resulting error says so.
    expect(OPTIMA_DB_PATH.startsWith("/data/")).toBe(false);
  });

  it("shows draft rules, or a local run renders an empty calendar", () => {
    // Every seed rule is `status: "draft"` and `evaluate()` excludes drafts by
    // default, so without this a contributor's first launch is a blank screen
    // that reads as a broken app. The E2E harness opts in for the same reason.
    expect(printEnv().OPTIMA_INCLUDE_DRAFT).toBe("true");
  });

  it("never overrides a value the operator set", () => {
    const env = printEnv({
      OPTIMA_DB_PATH: "/tmp/somewhere-else.sqlite",
      OPTIMA_INCLUDE_DRAFT: "false",
    });
    expect(env.OPTIMA_DB_PATH).toBe("/tmp/somewhere-else.sqlite");
    expect(env.OPTIMA_INCLUDE_DRAFT).toBe("false");
  });

  it("keeps its database where git cannot commit it", () => {
    // A public repo and a SQLite file holding somebody's EIN and filing
    // history. The default path is only safe while these patterns cover it.
    const ignored = read(".gitignore");
    expect(ignored).toContain("*.sqlite");
    expect(ignored).toMatch(/^data\/$/m);
  });

  it.each(["README.md", "CONTRIBUTING.md"])("%s tells the reader to run it", (file) => {
    expect(read(file)).toContain("npm run dev");
  });
});
