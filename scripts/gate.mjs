/**
 * The merge gate — and the one place its step list lives.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * `.github/workflows/gate.yml` runs `npm run gate`, which runs this file, so a
 * green local run and a green CI run are the same run rather than two lists
 * somebody keeps in sync by hand. That divergence is what let two type-check
 * scripts sit red on `main` for weeks: `apps/web` and `packages/ui` each had
 * one, and the root solution build the gate called reached neither (NEH-1174).
 *
 * ## Every step reports the size of the set it examined
 *
 * A check that passes over nothing is indistinguishable from a check that
 * passes, and it reads as reassurance. `0 problems over 0 files` and
 * `0 problems over 97 files` are the same output and different facts. So each
 * step's count is taken from the TOOL'S OWN report of what it read — tsc's
 * `--listFiles`, eslint's JSON result array, jest's suite total — never from a
 * second glob maintained here, which could only drift into agreeing with
 * itself.
 *
 * A count that stops moving when you add a file is the tell.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";
import { readFileSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Run a command, streaming its output through. Returns the exit code. */
function stream(command, args) {
  const r = spawnSync(command, args, { cwd: ROOT, stdio: "inherit", shell: false });
  return r.status ?? 1;
}

/** Run a command with stdout captured and stderr streamed. */
function capture(command, args) {
  const r = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "inherit"],
  });
  return { status: r.status ?? 1, stdout: r.stdout ?? "" };
}

/**
 * A tsc step, counted by `--listFiles`.
 *
 * The flag is appended by the gate rather than baked into the workspace
 * scripts: it is how the count is obtained, not something a person running
 * `npm run type-check` wants 1,200 lines of. Files under `node_modules` are
 * excluded from the count — `lib.es5.d.ts` and a dependency's `.d.ts` are read
 * by every run and tell you nothing about whether YOUR set changed.
 */
function typeCheck(label, npmArgs) {
  const { status, stdout } = capture("npm", [...npmArgs, "--", "--listFiles"]);
  const lines = stdout.split("\n");
  const listed = new Set();
  for (const line of lines) {
    const path = line.trim();
    // A `--listFiles` line is a bare absolute path; a diagnostic is
    // `file(1,2): error TS…`. Neither shape can be mistaken for the other.
    if (path.startsWith("/") && !path.includes("): error TS")) listed.add(path);
    else if (path) console.log(path);
  }
  const own = [...listed].filter((p) => !p.includes("/node_modules/"));
  return { status, examined: own.length, unit: "files typed outside node_modules" };
}

const steps = [
  {
    name: "rules:validate",
    run: () => ({ status: stream("npm", ["run", "rules:validate"]), examined: null }),
  },
  {
    name: "rules:barrel:check",
    run: () => ({ status: stream("npm", ["run", "rules:barrel:check"]), examined: null }),
  },
  {
    // The solution build: engine, db, rules, reminders, export, cli.
    //
    // It runs BEFORE the two workspace type-checks and the order is
    // load-bearing. `engine`, `rules`, `db` and `export` declare `main: ./dist`,
    // so on a cold checkout nothing has built them and `apps/web` reports 53
    // errors rather than 8 — 45 of them `TS2307 Cannot find module` and the
    // implicit-any fallout from it. Those are a build-order artefact, not a
    // defect, and chasing them is what made the first measurement of NEH-1174
    // wrong.
    name: "type-check (root solution)",
    run: () => typeCheck("root", ["run", "type-check"]),
  },
  {
    // NEH-1174: red on `main` and reachable from neither the gate nor CI,
    // because the root solution does not reference apps/web.
    name: "type-check (apps/web)",
    run: () => typeCheck("web", ["run", "type-check", "--workspace=@optima-compliance/web"]),
  },
  {
    // NEH-1174, and the worse half: this one could not be made green by
    // changing anything in this repo until it was given a `styled-system`
    // path mapping and a codegen step. It now measures packages/ui.
    name: "type-check (packages/ui)",
    run: () => typeCheck("ui", ["run", "type-check", "--workspace=@optima-compliance/ui"]),
  },
  {
    name: "lint",
    run: () => {
      // `-f json` so the count is eslint's own list of what it linted. Its
      // stylish output is not available alongside JSON, so problems are
      // rendered here — there are none on a green run, and on a red one this
      // prints the same file, line, rule and message.
      const { status, stdout } = capture("npx", [
        "eslint", ".", "--ext", "ts,tsx", "-f", "json",
      ]);
      let results;
      try {
        results = JSON.parse(stdout);
      } catch {
        // eslint failed before producing a report — a config error, say.
        // Surface it rather than reporting a count over nothing.
        process.stdout.write(stdout);
        return { status: status === 0 ? 1 : status, examined: 0, unit: "files linted" };
      }
      let problems = 0;
      for (const r of results) {
        for (const m of r.messages) {
          problems += 1;
          const where = `${relative(ROOT, r.filePath)}:${m.line}:${m.column}`;
          const sev = m.severity === 2 ? "error" : "warning";
          console.log(`${where}  ${sev}  ${m.message}  ${m.ruleId ?? ""}`);
        }
      }
      console.log(`${problems} problem(s) over ${results.length} file(s) linted.`);
      return { status, examined: results.length, unit: "files linted" };
    },
  },
  {
    name: "test",
    run: () => {
      // Jest prints its own input-set size — "Test Suites: N total" — to
      // stderr, which streams through. Re-deriving it here would be a second
      // count that could only disagree with the first.
      // `--coverage`, so the threshold in `jest.config.mjs` is enforced by the
      // gate rather than by whoever remembers to ask. Same run, so it costs one
      // pass rather than two — and the denominator it prints (statements in the
      // codebase, not statements a test happened to load) is the input-set size
      // this step was previously reporting without.
      const r = spawnSync("npx", ["jest", "--ci", "--coverage"], {
        cwd: ROOT,
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
        stdio: ["ignore", "inherit", "pipe"],
      });
      process.stderr.write(r.stderr ?? "");
      const suites = /Test Suites:.*?(\d+) total/.exec(r.stderr ?? "")?.[1];
      const tests = /Tests:.*?(\d+) total/.exec(r.stderr ?? "")?.[1];
      // Read from the summary file rather than scraped from the reporter: the
      // number that matters is the DENOMINATOR — how many statements exist —
      // and a percentage on its own cannot show that shrinking.
      let cov = "";
      try {
        const total = JSON.parse(
          readFileSync(join(ROOT, "coverage/coverage-summary.json"), "utf8"),
        ).total.statements;
        cov = `, ${total.pct}% of ${total.total} statements`;
      } catch {
        // Absent only if jest failed before writing it, which the status
        // already reports. Silence here rather than a second failure mode.
      }
      return {
        status: r.status ?? 1,
        examined: suites ? Number(suites) : null,
        unit: tests ? `test suites (${tests} tests${cov})` : "test suites",
      };
    },
  },
];

const summary = [];
for (const step of steps) {
  console.log(`\n── ${step.name} ──`);
  const { status, examined, unit } = step.run();
  summary.push({ name: step.name, status, examined, unit });
  if (status !== 0) {
    report(summary, steps.length);
    console.error(`\ngate FAILED at "${step.name}".`);
    process.exit(status);
  }
}
report(summary, steps.length);
console.log("\ngate PASSED.");

function report(rows, total) {
  console.log(`\n── gate summary (${rows.length}/${total} steps run) ──`);
  for (const r of rows) {
    const size = r.examined === null ? "(counted in its own output above)" : `${r.examined} ${r.unit}`;
    console.log(`  ${r.status === 0 ? "pass" : "FAIL"}  ${r.name.padEnd(28)} examined ${size}`);
  }
}
