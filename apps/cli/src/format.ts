/**
 * Rendering. Pure, so it can be tested without running a process.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import {
  AUTOMATIC_REVOCATION,
  isAnnualExemptOrganizationReturn,
} from "@optima-compliance/engine";
import type { EvaluationResult, Obligation } from "@optima-compliance/engine";

/**
 * The disclaimer.
 *
 * Printed on every human-readable run, not hidden behind `--help`. This tool
 * tells people when to file with a government, and a missed deadline costs real
 * money — so the caveat belongs where the answer is, every time, not in a
 * document nobody opens twice.
 *
 * Omitted from `--json` on purpose: that output is consumed by a program, and
 * the obligation to inform the human sits with whatever renders it.
 */
export const DISCLAIMER = [
  "This is not legal or tax advice. Deadlines and fees change, and your",
  "circumstances may be unusual. Every line above cites its source — check",
  "anything that matters. You remain responsible for your own filings.",
].join("\n");

/**
 * The consequence that is not a late fee.
 *
 * 26 U.S.C. 6033(j): an annual return or e-Postcard unfiled for three
 * consecutive years revokes exempt status automatically, on the due date of the
 * third. The rule pack has said so in a `notes` field since the first federal
 * rule was written, and no user of this tool has ever seen it — a printed row
 * for Form 990-N looked exactly like a printed row for a state annual report.
 *
 * It states the rule and says nothing about the reader. Nothing here records
 * what anybody filed in a prior year, so implying a customer has missed
 * anything would be a claim on evidence this tool does not have.
 *
 * Printed only when the run actually contains one of those returns, including
 * an undecided one — an organisation that has not answered the foundation or
 * supporting-organisation question still owes one of them.
 *
 * Omitted from `--json` for the same reason `DISCLAIMER` is: that output feeds
 * a program, and the duty to inform a human belongs to whatever renders it.
 */
export const REVOCATION_NOTICE = [
  `  An annual return or e-Postcard — Form 990, 990-EZ, 990-N or 990-PF —`,
  `  unfiled for ${AUTOMATIC_REVOCATION.consecutiveYears} CONSECUTIVE YEARS revokes tax-exempt status`,
  "  automatically, on the due date of the third. Getting it back means a new",
  "  exemption application and a user fee. This is the rule, not a statement",
  `  about your filings — nothing here knows what you have filed. ${AUTOMATIC_REVOCATION.citation}.`,
].join("\n");

/**
 * What a `--format csv` or `--format ics` file from this command contains.
 *
 * ## Not a bug being papered over — a scope being stated
 *
 * The self-host dashboard holds two kinds of dated item: obligations the engine
 * DERIVED from a cited statute, and actions a person WROTE DOWN themselves. Its
 * export route carries both. This command carries only the first, because it
 * has nowhere to read the second from: its entire input is a facts file,
 * `evaluate` is pure, and opening a database would change what the command
 * requires in order to run at all.
 *
 * The join is missing as well as the dependency. A stored action points at a
 * STORED entity by id; an entity read out of a JSON file has no id. So handing
 * this command a database would mean printing every action in it beside one
 * file's obligations — a different command from `check --entity`, not a wider
 * version of this one.
 *
 * ## Why it is printed rather than merely documented
 *
 * A file that quietly covers half of somebody's calendar is the problem
 * whether the missing half was dropped or was never in scope, and the person
 * exporting it cannot tell the difference from the file. So the scope is said
 * out loud: here on stderr during the run, and in `--help` before it.
 *
 * On STDERR, deliberately. stdout is what gets piped into a spreadsheet, and a
 * caveat that lands in the data is not a caveat.
 */
export const EXPORT_SCOPE_NOTE = [
  "Note: this export lists the deadlines worked out from the rule pack for the",
  "facts in your entity file. Deadlines you added yourself are kept by the",
  "dashboard, which this command does not read — so a csv or calendar file from",
  "here is not your whole calendar.",
].join(" ");

export function formatMoney(minorUnits: number, currency = "USD"): string {
  // Integer arithmetic to the last step. Dividing by 100 early would introduce
  // exactly the float error the minor-units convention exists to prevent.
  const sign = minorUnits < 0 ? "-" : "";
  const absolute = Math.abs(minorUnits);
  const major = Math.trunc(absolute / 100);
  const minor = String(absolute % 100).padStart(2, "0");
  const symbol = currency === "USD" ? "$" : `${currency} `;
  return `${sign}${symbol}${major.toLocaleString("en-US")}.${minor}`;
}

function feeColumn(obligation: Obligation): string {
  // A rule with no stated fee shows "—", never "$0.00". Reporting zero would
  // claim the filing is free when what we actually know is that the fee was
  // never recorded.
  return obligation.feeMinorUnits === undefined
    ? "—"
    : formatMoney(obligation.feeMinorUnits, obligation.currency);
}

function pad(text: string, width: number): string {
  return text.length >= width ? text : text + " ".repeat(width - text.length);
}

export interface RenderOptions {
  entityName: string;
  asOf: string;
  horizonMonths: number;
}

export function renderResult(
  result: EvaluationResult,
  options: RenderOptions,
): string {
  const lines: string[] = [];
  const { obligations, indeterminate } = result;

  lines.push(
    `${options.entityName} — obligations from ${options.asOf}, next ${options.horizonMonths} months`,
    "",
  );

  if (obligations.length === 0) {
    lines.push("  Nothing due in this window.");
  } else {
    const rows = obligations.map((o) => ({
      due: o.dueOn,
      where: o.jurisdiction,
      what: o.status === "draft" ? `${o.title}  [DRAFT]` : o.title,
      fee: feeColumn(o),
      agency: o.agency,
      citation: o.citation,
    }));

    const w = {
      due: Math.max(3, ...rows.map((r) => r.due.length)),
      where: Math.max(5, ...rows.map((r) => r.where.length)),
      what: Math.max(6, ...rows.map((r) => r.what.length)),
      fee: Math.max(3, ...rows.map((r) => r.fee.length)),
    };

    lines.push(
      `  ${pad("DUE", w.due)}  ${pad("WHERE", w.where)}  ${pad("WHAT", w.what)}  ${pad("FEE", w.fee)}`,
    );
    for (const row of rows) {
      lines.push(
        `  ${pad(row.due, w.due)}  ${pad(row.where, w.where)}  ${pad(row.what, w.what)}  ${pad(row.fee, w.fee)}`,
      );
      lines.push(`  ${" ".repeat(w.due)}  ${row.agency} · ${row.citation}`);
    }
  }

  if (indeterminate.length > 0) {
    // Reported prominently rather than tucked away: an incomplete calendar
    // presented as complete is this product's worst failure, and the user can
    // usually resolve it in seconds by supplying one number.
    lines.push("", "  Cannot tell yet — these depend on facts not supplied:");
    for (const rule of indeterminate) {
      lines.push(
        `    ${rule.jurisdiction}  ${rule.title}  (needs: ${rule.missingFacts.join(", ")})`,
      );
    }
  }

  // The DATA, not a flag and not an unconditional footer. See
  // REVOCATION_NOTICE: an undecided rule counts, because the organisation still
  // owes one of these returns even though we cannot yet say which.
  const touchesAnnualReturn =
    obligations.some((o) => isAnnualExemptOrganizationReturn(o.ruleId)) ||
    indeterminate.some((r) => isAnnualExemptOrganizationReturn(r.ruleId));
  if (touchesAnnualReturn) {
    lines.push("", REVOCATION_NOTICE);
  }

  const drafts = obligations.filter((o) => o.status === "draft").length;
  if (drafts > 0) {
    lines.push(
      "",
      `  ${drafts} line(s) marked [DRAFT] come from rules NOT yet checked against`,
      "  the statute by a human. Treat them as a prompt to verify, not as fact.",
    );
  }

  lines.push("", DISCLAIMER);
  return lines.join("\n");
}
