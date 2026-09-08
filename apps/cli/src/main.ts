#!/usr/bin/env node
/**
 * The process boundary. Everything else in this package is pure.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { readFileSync } from "node:fs";
import { evaluate, type EntityFacts } from "@optima-compliance/engine";
import { ALL_RULES } from "@optima-compliance/rules";
import { toCsv, toICalendar } from "@optima-compliance/export";
import { parseArgs, USAGE } from "./args.js";
import { EXPORT_SCOPE_NOTE, renderResult } from "./format.js";

const VERSION = "0.1.0";

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

function loadEntity(path: string): EntityFacts {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    fail(`Cannot read entity file: ${path}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    fail(`${path} is not valid JSON: ${(error as Error).message}`);
  }

  // Checked here rather than trusted, because the engine's types vanish at
  // runtime and a missing `jurisdictions` would otherwise surface as an
  // empty calendar — which reads as "you owe nothing", the most dangerous
  // wrong answer this tool can give.
  const entity = parsed as Partial<EntityFacts>;
  const missing = (
    [
      "name",
      "entityTypes",
      "formedOn",
      "homeJurisdiction",
      "jurisdictions",
      "fiscalYearEnd",
    ] as const
  ).filter((key) => entity[key] === undefined);

  if (missing.length > 0) {
    fail(`${path} is missing required field(s): ${missing.join(", ")}`);
  }
  if (!Array.isArray(entity.jurisdictions) || entity.jurisdictions.length === 0) {
    fail(`${path}: "jurisdictions" must list at least one jurisdiction.`);
  }

  return entity as EntityFacts;
}

const parsed = parseArgs(process.argv.slice(2));

switch (parsed.kind) {
  case "help":
    process.stdout.write(`${USAGE}\n`);
    break;
  case "version":
    process.stdout.write(`${VERSION}\n`);
    break;
  case "error":
    process.stderr.write(`${parsed.message}\n\n${USAGE}\n`);
    process.exit(2);
    break;
  case "check": {
    const { entityPath, asOf, horizonMonths, includeDraft, format, reminderDaysBefore } =
      parsed.options;
    const entity = loadEntity(entityPath);

    let result;
    try {
      result = evaluate(entity, ALL_RULES, { asOf, horizonMonths, includeDraft });
    } catch (error) {
      // Almost always a malformed date in the entity file. The engine's
      // RangeError names it precisely, so pass it through rather than
      // replacing it with something vaguer.
      fail(`Could not evaluate: ${(error as Error).message}`);
    }

    switch (format) {
      case "json":
        process.stdout.write(
          `${JSON.stringify({ asOf, horizonMonths, ...result }, null, 2)}\n`,
        );
        break;
      case "ics":
        process.stdout.write(
          toICalendar(result.obligations, {
            // asOf, not the clock. Re-exporting the same calendar for the same
            // date produces a byte-identical file, so it can be diffed and
            // committed — and the engine's determinism is not undone at the
            // last step.
            dtstamp: `${asOf.replaceAll("-", "")}T000000Z`,
            calendarName: `${entity.name} — compliance`,
            ...(reminderDaysBefore.length > 0
              ? { reminderDaysBefore }
              : {}),
          }),
        );
        break;
      case "csv":
        process.stdout.write(toCsv(result.obligations));
        break;
      case "text":
        process.stdout.write(
          `${renderResult(result, { entityName: entity.name, asOf, horizonMonths })}\n`,
        );
        break;
    }

    // Two things are absent from a calendar or a spreadsheet, and only one of
    // them was ever mentioned.
    //
    // Both go to stderr, and that is what makes them safe to print
    // unconditionally: stdout stays clean for the pipe into a spreadsheet, and
    // a caveat that landed in the data would not be a caveat.
    if (format === "ics" || format === "csv") {
      // An indeterminate rule has no date to put on a row. This one is
      // conditional because it is a fact about THIS run.
      if (result.indeterminate.length > 0) {
        process.stderr.write(
          `Note: ${result.indeterminate.length} rule(s) could not be decided and are not in this export. ` +
            `Run without --format to see what facts are missing.\n`,
        );
      }

      // A deadline the user wrote down themselves is absent for a different
      // reason: this command has no store to read one from. That is a property
      // of the command rather than of the run, so it is stated every time —
      // see EXPORT_SCOPE_NOTE for why the scope is what it is. Somebody who
      // also uses the dashboard would otherwise take this file for their whole
      // calendar, and nothing in it would say otherwise.
      process.stderr.write(`${EXPORT_SCOPE_NOTE}\n`);
    }
    break;
  }
}
