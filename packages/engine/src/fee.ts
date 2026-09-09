/**
 * Turning a fee into words.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * **In the engine rather than in each consumer, deliberately.** A fee is now
 * three states — exact, a range with a reason, and absent — and every surface
 * that shows money has to get all three right: the dashboard, the CLI table,
 * the iCalendar description and the CSV. Four independent renderings of a
 * three-way branch is four chances to show a minimum as though it were the
 * price, which is the defect this whole change exists to remove (NEH-403). The
 * repo already learned this from `provenanceOf`: two independent copies is
 * exactly how they drifted apart in the first place.
 *
 * What stays with the consumer is styling. What lives here is the arithmetic
 * and the wording of the amount itself, because those must not differ between
 * a calendar invite and the screen it came from.
 */
import type { Obligation } from "./evaluate.js";

/**
 * Money, from integer minor units.
 *
 * Integer arithmetic to the last step: dividing by 100 early reintroduces
 * exactly the float error the minor-units convention exists to prevent.
 */
export function formatMinorUnits(minorUnits: number, currency = "USD"): string {
  const sign = minorUnits < 0 ? "-" : "";
  const absolute = Math.abs(minorUnits);
  const major = Math.trunc(absolute / 100).toLocaleString("en-US");
  const minor = String(absolute % 100).padStart(2, "0");
  const symbol = currency === "USD" ? "$" : `${currency} `;
  return `${sign}${symbol}${major}.${minor}`;
}

/**
 * The amount, in words, or `undefined` when no fee was ever recorded.
 *
 * **`undefined` must not be rendered as zero or as "free".** What we know is
 * that nobody established the cost, which is a different claim from "there is
 * no cost" and belongs to a different reader.
 *
 * An open-ended range says what it knows and no more: "at least $175" is a real
 * statement about a statute that sets a floor and no ceiling, and it is worth
 * far more to someone budgeting than silence is.
 */
export function feeAmountText(obligation: Obligation): string | undefined {
  if (obligation.feeMinorUnits !== undefined) {
    return formatMinorUnits(obligation.feeMinorUnits, obligation.currency);
  }

  const range = obligation.feeRange;
  if (range === undefined) return undefined;

  const low =
    range.minimumMinorUnits === undefined
      ? undefined
      : formatMinorUnits(range.minimumMinorUnits, range.currency);
  const high =
    range.maximumMinorUnits === undefined
      ? undefined
      : formatMinorUnits(range.maximumMinorUnits, range.currency);

  if (low !== undefined && high !== undefined) return `${low} – ${high}`;
  if (low !== undefined) return `at least ${low}`;
  if (high !== undefined) return `up to ${high}`;
  // The schema requires at least one bound, so this is unreachable through a
  // validated rule. Returning the explanation's existence rather than throwing:
  // a malformed rule should not take down a calendar somebody needs today.
  return undefined;
}

/**
 * Why the amount is a range, for showing to the filer verbatim.
 *
 * Separate from `feeAmountText` because they belong in different places on a
 * screen — the amount goes in the cell, the reason goes where there is room to
 * read it. A consumer that shows the range and drops this is showing a number
 * with no way to act on it.
 */
export function feeExplanation(obligation: Obligation): string | undefined {
  return obligation.feeRange?.explanation;
}
