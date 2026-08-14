/**
 * US federal holidays, computed rather than listed — NEH-443.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * ## Why this exists
 *
 * `weekendRule` handled Saturday and Sunday and nothing else, so a deadline
 * landing on a legal holiday was shown as-is under both directions. The 990
 * family is the sharp case: it opts into `roll-forward` and its citation quotes
 * the IRS in full —
 *
 * > "If a due date falls on a Saturday, Sunday, or legal holiday, the due date
 * > is delayed until the next business day."
 *
 * — so the product implemented two thirds of a rule it displayed in full.
 *
 * ## Federal only, and that is a deliberate stopping point
 *
 * Federal holidays are tractable: 5 U.S.C. 6103(a) names eleven, six of them
 * nth-weekday and five fixed-date, all computable from the year alone with no
 * data feed and nothing to drift. **State holidays are not** — they vary, some
 * float, and a few states observe days no other state does. Washington alone
 * has one the federal calendar lacks.
 *
 * So this handles federal days for rules that ask for it, and state rules are
 * left explicitly alone rather than approximated. That matters because the
 * failure mode named in `calendar.ts` is real: a half-right implementation
 * moves some dates correctly and leaves others wrong with **no way to tell
 * which from the output**. Hence `holidayCalendar` is opt-in per rule, exactly
 * as `weekendRule` is, and every obligation reports which calendar was applied
 * — "we did not check" and "we checked and there is none" are different claims
 * and a compliance product must not make the stronger one for free.
 *
 * Nothing here reads a clock, a file or the network. Same purity contract as
 * the rest of the engine.
 */

import { addDays, dayOfWeek, formatDate, parseDate } from "./calendar.js";
// `CalendarDate` lives in the fact model, not in `calendar.ts` — the date
// helpers import it too. Taking it from the right place keeps this module's
// dependency on `calendar.ts` to the arithmetic it actually uses.
import type { CalendarDate } from "./facts.js";

/** The holiday calendars a rule may name. Add a value; never rename one. */
export const HOLIDAY_CALENDARS = ["us-federal"] as const;
export type HolidayCalendar = (typeof HOLIDAY_CALENDARS)[number];

/** The nth `weekday` of `month`; `nth = -1` means the LAST one. */
function nthWeekdayOf(year: number, month: number, weekday: number, nth: number): CalendarDate {
  if (nth === -1) {
    // Walk back from the month end. Memorial Day is "the last Monday in May",
    // which is the 5th Monday in some years and the 4th in others — counting
    // forward would need to know which, and this does not.
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    let date = formatDate({ year, month, day: lastDay });
    while (dayOfWeek(date) !== weekday) date = addDays(date, -1);
    return date;
  }

  let date = formatDate({ year, month, day: 1 });
  while (dayOfWeek(date) !== weekday) date = addDays(date, 1);
  return addDays(date, (nth - 1) * 7);
}

/**
 * The eleven federal holidays of 5 U.S.C. 6103(a), on the dates they FALL —
 * before any weekend-observance shift.
 */
function federalHolidaysFalling(year: number): CalendarDate[] {
  return [
    formatDate({ year, month: 1, day: 1 }), // New Year's Day
    nthWeekdayOf(year, 1, 1, 3), // Martin Luther King, Jr. Day — 3rd Monday
    nthWeekdayOf(year, 2, 1, 3), // Washington's Birthday — 3rd Monday
    nthWeekdayOf(year, 5, 1, -1), // Memorial Day — LAST Monday
    formatDate({ year, month: 6, day: 19 }), // Juneteenth
    formatDate({ year, month: 7, day: 4 }), // Independence Day
    nthWeekdayOf(year, 9, 1, 1), // Labor Day — 1st Monday
    nthWeekdayOf(year, 10, 1, 2), // Columbus Day — 2nd Monday
    formatDate({ year, month: 11, day: 11 }), // Veterans Day
    nthWeekdayOf(year, 11, 4, 4), // Thanksgiving — 4th Thursday
    formatDate({ year, month: 12, day: 25 }), // Christmas Day
  ];
}

/**
 * Shift a fixed-date holiday to the day it is OBSERVED.
 *
 * 5 U.S.C. 6103(a) and E.O. 11582: a holiday falling on Saturday is observed
 * the preceding Friday, and one falling on Sunday the following Monday. The six
 * nth-weekday holidays always fall on a weekday, so this only ever moves the
 * five fixed-date ones — but it is applied uniformly because doing so is a
 * no-op for the others and a special case would be a thing to get wrong later.
 */
function observed(date: CalendarDate): CalendarDate {
  const dow = dayOfWeek(date);
  if (dow === 6) return addDays(date, -1);
  if (dow === 0) return addDays(date, 1);
  return date;
}

/**
 * Every OBSERVED federal holiday in `year`.
 *
 * The adjacent years are included because observance crosses a year boundary:
 * when 1 January falls on a Saturday it is observed on **31 December of the
 * previous year**, which is a federal holiday inside `year - 1` that a
 * naive per-year computation would miss entirely. 2022 is a real instance —
 * 1 Jan 2022 was a Saturday, so 31 Dec 2021 was the observed holiday.
 */
export function federalHolidays(year: number): Set<CalendarDate> {
  const observedDates = new Set<CalendarDate>();
  for (const y of [year - 1, year, year + 1]) {
    for (const falling of federalHolidaysFalling(y)) {
      observedDates.add(observed(falling));
    }
  }
  return new Set([...observedDates].filter((d) => parseDate(d).year === year));
}

/** Is `date` an observed US federal holiday? */
export function isFederalHoliday(date: CalendarDate): boolean {
  return federalHolidays(parseDate(date).year).has(date);
}

/**
 * Is `date` a day this calendar treats as closed?
 *
 * Named for what it means rather than "is it a holiday", because the roll
 * functions need one predicate covering weekends AND holidays — a date can be
 * both (Christmas on a Sunday), and asking two questions in sequence is how a
 * roll lands on the second kind of closed day.
 */
export function isClosed(date: CalendarDate, calendar?: HolidayCalendar): boolean {
  const dow = dayOfWeek(date);
  if (dow === 0 || dow === 6) return true;
  if (calendar === "us-federal") return isFederalHoliday(date);
  return false;
}

/**
 * The roll functions live HERE rather than beside their weekend-only twins in
 * `calendar.ts`, and that is a dependency decision rather than a filing one:
 * this module imports the date primitives, so `calendar.ts` importing these
 * would be a cycle. The weekend-only pair stays self-contained there.
 *
 * Both iterate rather than counting days, because closed days chain. Christmas
 * 2027 falls on a Saturday and is observed on Friday 24 December, so a deadline
 * on that Friday has to clear the observed holiday AND the weekend behind it —
 * a single "+1 if Saturday, +2 if Sunday" step lands back on a closed day.
 *
 * The loop is bounded so a calendar that somehow closed every day cannot hang
 * the evaluator. Ten is far beyond any real run of closed days, and a bound
 * that is hit returns a still-closed date rather than looping — visible in a
 * test, unlike a hang.
 */
export function rollForwardToBusinessDay(
  date: CalendarDate,
  calendar?: HolidayCalendar,
): CalendarDate {
  let result = date;
  for (let i = 0; i < 10 && isClosed(result, calendar); i += 1) {
    result = addDays(result, 1);
  }
  return result;
}

/** The backward twin. See above for why both live here. */
export function rollBackwardToBusinessDay(
  date: CalendarDate,
  calendar?: HolidayCalendar,
): CalendarDate {
  let result = date;
  for (let i = 0; i < 10 && isClosed(result, calendar); i += 1) {
    result = addDays(result, -1);
  }
  return result;
}
