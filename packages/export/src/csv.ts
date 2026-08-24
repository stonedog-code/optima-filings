/**
 * CSV generation (RFC 4180).
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { Obligation } from "@optima-compliance/engine";

import { isCalendarAction, type CalendarAction } from "./action.js";

const HEADERS = [
  "due_on",
  // FIRST, and it is the most important column in the file (NEH-1147). The
  // export now carries two kinds of row — deadlines the engine derived from a
  // cited statute, and reminders the customer typed — and a spreadsheet that
  // renders them identically overstates one of them. Every column after
  // `title` is empty for a user row, which is a weak signal; a named one is
  // not.
  "source",
  "jurisdiction",
  "title",
  "detail",
  "completed_on",
  "agency",
  "form",
  "fee_minor_units",
  "currency",
  "citation",
  "citation_url",
  "status",
  "last_verified",
  "rule_id",
] as const;

/**
 * Quote a field per RFC 4180.
 *
 * Always quoting would be simpler, but the output is read by humans in
 * spreadsheets as often as by programs, and a file where every cell is quoted
 * is markedly harder to scan. Quote only what needs it.
 *
 * A leading `=`, `+`, `-` or `@` is also quoted AND prefixed with a single
 * quote: spreadsheet applications interpret those as the start of a formula,
 * which turns a citation into a broken cell at best and a formula-injection
 * vector at worst. Rule citations legitimately begin with `-` in some
 * jurisdictions, so this is not hypothetical.
 */
function field(value: string | number | undefined): string {
  if (value === undefined) return "";
  let text = String(value);

  const neutralised = /^[=+\-@\t\r]/.test(text);
  if (neutralised) text = `'${text}`;

  // A neutralised field is quoted as well. The apostrophe alone satisfies the
  // spreadsheet, but quoting makes it unambiguous to a human reading the raw
  // file that this is a text literal and the apostrophe was added deliberately
  // — unquoted, it just looks like corrupt data.
  return neutralised || /[",\r\n]/.test(text)
    ? `"${text.replaceAll('"', '""')}"`
    : text;
}

/**
 * Serialise deadlines — BOTH kinds — to a spreadsheet.
 *
 * The parameter was WIDENED rather than replaced, for the reason `toICalendar`
 * gives: this package is published and has an external consumer, and
 * `readonly Obligation[]` stays assignable to the union.
 *
 * A user-authored row fills `due_on`, `source`, `title`, `detail` and
 * `completed_on` and leaves the provenance columns EMPTY. That asymmetry is
 * the honest rendering — a reminder has no agency, no fee and no statute, and
 * inventing placeholders would make it look like a claim the product stands
 * behind.
 */
export function toCsv(items: readonly (Obligation | CalendarAction)[]): string {
  const rows = [
    HEADERS.join(","),
    ...items.map((item) =>
      (isCalendarAction(item)
        ? [
            item.dueOn,
            "user",
            undefined,
            item.title,
            item.detail,
            item.completedOn,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          ]
        : [
            item.dueOn,
            "rule",
            item.jurisdiction,
            item.title,
            undefined,
            undefined,
            item.agency,
            item.form,
            // Minor units, not dollars. A spreadsheet reading "60.00" may
            // reformat or round it; an integer count of cents survives every
            // round trip, and the header names the unit so nobody misreads
            // 6000 as six thousand dollars.
            item.feeMinorUnits,
            item.currency,
            item.citation,
            item.citationUrl,
            item.status,
            item.lastVerified,
            item.ruleId,
          ]
      )
        .map(field)
        .join(","),
    ),
  ];
  return `${rows.join("\r\n")}\r\n`;
}
