/**
 * CSV generation (RFC 4180).
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { Obligation } from "@optima-compliance/engine";

import { isCalendarAction, type CalendarAction } from "./action.js";

/**
 * The columns, and the ORDER IS A COMPATIBILITY CONTRACT (NEH-1147).
 *
 * The three new columns are APPENDED, never inserted, and that is deliberate
 * even though `source` is the one a reader most wants early.
 *
 * `apps/cli` writes this straight to stdout, where `cut -d, -f2` is an entirely
 * ordinary thing for somebody to have written. Inserting a column mid-row keeps
 * every such script running and starts feeding it the wrong field — a
 * positional reader expecting `jurisdiction` at index 1 would silently get the
 * literal `rule`. Wrong-but-running is a far worse outcome than a missing
 * column, and it is the exact failure shape this issue was about.
 *
 * A header-aware reader finds a column wherever it is, so nothing is lost by
 * appending except the human's scroll distance.
 */
const HEADERS = [
  // --- the original twelve, in their original positions. Do not reorder. ---
  "due_on",
  "jurisdiction",
  "title",
  "agency",
  "form",
  "fee_minor_units",
  "currency",
  "citation",
  "citation_url",
  "status",
  "last_verified",
  "rule_id",
  // --- appended for user-authored rows ---
  // `source` names which kind of claim a row is. The export carries deadlines
  // the engine derived from a cited statute alongside reminders the customer
  // typed, and a spreadsheet that renders them identically overstates one of
  // them. Every provenance cell being empty is a weak signal; a named column is
  // not.
  "source",
  "detail",
  "completed_on",
  // --- appended for inexact fees (NEH-403) ---
  // `fee_minor_units` holds a fee that is ONE number and is left empty for a
  // range, deliberately: a reader summing that column would otherwise add a
  // minimum as though it were the price. The bounds get their own columns so a
  // spreadsheet can still budget with them, and the explanation says why the
  // two differ. All three are empty for an exact fee.
  "fee_minimum_minor_units",
  "fee_maximum_minor_units",
  "fee_explanation",
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
            // The ten provenance columns stay EMPTY rather than carrying
            // placeholders. A reminder has no agency, no fee and no statute,
            // and inventing values would make it look like a claim the product
            // stands behind.
            undefined, // jurisdiction
            item.title,
            undefined, // agency
            undefined, // form
            undefined, // fee_minor_units
            undefined, // currency
            undefined, // citation
            undefined, // citation_url
            undefined, // status
            undefined, // last_verified
            undefined, // rule_id
            "user",
            item.detail,
            item.completedOn,
            undefined, // fee_minimum_minor_units — a reminder has no fee
            undefined, // fee_maximum_minor_units
            undefined, // fee_explanation
          ]
        : [
            item.dueOn,
            item.jurisdiction,
            item.title,
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
            "rule",
            undefined, // detail — user rows only
            undefined, // completed_on — an obligation is computed, never completed
            // Empty for an exact fee, populated for a range. Never both: the
            // two are mutually exclusive on an obligation, which is what stops
            // a column sum from mixing a price with a floor.
            item.feeRange?.minimumMinorUnits,
            item.feeRange?.maximumMinorUnits,
            item.feeRange?.explanation,
          ]
      )
        .map(field)
        .join(","),
    ),
  ];
  return `${rows.join("\r\n")}\r\n`;
}
