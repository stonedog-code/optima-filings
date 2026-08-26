/**
 * Argument parsing. Pure and total — returns errors rather than exiting, so it
 * is testable and so the process boundary stays in one file.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export const OUTPUT_FORMATS = ["text", "json", "ics", "csv"] as const;
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

export interface CheckOptions {
  entityPath: string;
  asOf: string;
  horizonMonths: number;
  includeDraft: boolean;
  format: OutputFormat;
  /** Days before each due date to fire a calendar alarm. `ics` only. */
  reminderDaysBefore: number[];
}

export type ParseResult =
  | { kind: "check"; options: CheckOptions }
  | { kind: "help" }
  | { kind: "version" }
  | { kind: "error"; message: string };

export const USAGE = `optima — compliance calendar

USAGE
  optima check --entity <file.json> [options]

OPTIONS
  --entity <path>     Entity facts as JSON. Required.
  --as-of <date>      Evaluate as of this YYYY-MM-DD date. Defaults to today.
  --months <n>        How far ahead to look. Default 12.
  --include-draft     Include rules not yet verified against their statute.
                      Excluded by default: an unverified deadline shown as fact
                      is worse than no answer.
  --format <fmt>      text (default) | json | ics | csv
                      ics writes an iCalendar file for import into Google
                      Calendar, Outlook, or Apple Calendar. csv opens in a
                      spreadsheet. Both omit the disclaimer as prose, so it
                      travels inside the events and the caller inherits it.
  --json              Shorthand for --format json.
  --remind <days>     Comma-separated lead times for calendar alarms, e.g.
                      30,7. Applies to --format ics only. A deadline you hear
                      about on the day is nearly useless — most filings take
                      longer than that to prepare.
  -h, --help
  -v, --version

ENTITY FILE
  {
    "name": "Example Cascade Trails Association",
    "entityTypes": ["501c3", "nonprofit-corp"],
    "formedOn": "2021-03-15",
    "homeJurisdiction": "US-WA",
    "jurisdictions": ["US", "US-WA"],
    "fiscalYearEnd": "12-31",
    "grossRevenueMinorUnits": 4200000,
    "solicitsCharitableContributions": true,
    "isPrivateFoundation": false
  }

  Money is integer minor units: 4200000 is $42,000.00.
  Omit a fact you do not know rather than guessing — an unknown is reported
  as "cannot tell yet", and a guess is reported as an answer.`;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseArgs(argv: readonly string[]): ParseResult {
  if (argv.length === 0) return { kind: "help" };
  if (argv.includes("-h") || argv.includes("--help")) return { kind: "help" };
  if (argv.includes("-v") || argv.includes("--version")) return { kind: "version" };

  const [command, ...rest] = argv;
  if (command !== "check") {
    return { kind: "error", message: `Unknown command: ${command}` };
  }

  let entityPath: string | undefined;
  let asOf: string | undefined;
  let horizonMonths = 12;
  let includeDraft = false;
  let format: OutputFormat = "text";
  let reminderDaysBefore: number[] = [];

  for (let i = 0; i < rest.length; i += 1) {
    const flag = rest[i];
    switch (flag) {
      case "--entity":
        entityPath = rest[++i];
        if (!entityPath) return { kind: "error", message: "--entity needs a path" };
        break;
      case "--as-of":
        asOf = rest[++i];
        if (!asOf || !DATE_PATTERN.test(asOf)) {
          return { kind: "error", message: "--as-of needs a YYYY-MM-DD date" };
        }
        break;
      case "--months": {
        const raw = rest[++i];
        const parsed = Number(raw);
        if (!raw || !Number.isInteger(parsed) || parsed < 1 || parsed > 600) {
          return { kind: "error", message: "--months needs an integer from 1 to 600" };
        }
        horizonMonths = parsed;
        break;
      }
      case "--include-draft":
        includeDraft = true;
        break;
      case "--json":
        format = "json";
        break;
      case "--format": {
        const raw = rest[++i];
        if (!raw || !OUTPUT_FORMATS.includes(raw as OutputFormat)) {
          return {
            kind: "error",
            message: `--format must be one of: ${OUTPUT_FORMATS.join(", ")}`,
          };
        }
        format = raw as OutputFormat;
        break;
      }
      case "--remind": {
        const raw = rest[++i];
        const days = (raw ?? "").split(",").map((part) => Number(part.trim()));
        if (!raw || days.some((d) => !Number.isInteger(d) || d < 0 || d > 365)) {
          return {
            kind: "error",
            message: "--remind needs comma-separated whole days from 0 to 365, e.g. 30,7",
          };
        }
        reminderDaysBefore = days;
        break;
      }
      default:
        return { kind: "error", message: `Unknown option: ${flag}` };
    }
  }

  if (!entityPath) {
    return { kind: "error", message: "--entity is required" };
  }

  return {
    kind: "check",
    options: {
      entityPath,
      // The engine is deliberately clock-free, so something has to supply the
      // date. That something is here, at the process boundary, and never
      // further in — which is what keeps the engine reproducible.
      asOf: asOf ?? todayUtc(),
      horizonMonths,
      includeDraft,
      format,
      reminderDaysBefore,
    },
  };
}

/** Today, in UTC. The only place this tool reads a clock. */
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}
