/**
 * Calendar-date arithmetic on `YYYY-MM-DD` strings.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Every function here is pure, total, and clock-free. Nothing in this file
 * calls `Date.now()` or constructs a zoned date, and nothing in the engine may
 * either — see the module docs in `index.ts` for why.
 *
 * `Date` is used *internally* in two places, both with explicit UTC
 * constructors and both converted straight back to a string. `Date.UTC` is
 * genuinely the cheapest correct way to normalise an overflowing day-of-month
 * and to find a weekday, and keeping it behind these functions means no caller
 * ever holds an object that can drift by a timezone.
 */

import type { CalendarDate, MonthDay } from "./facts.js";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_DAY_PATTERN = /^(\d{2})-(\d{2})$/;

export interface DateParts {
  year: number;
  /** 1-12. Not the 0-11 that `Date` uses; that offset is a classic defect source. */
  month: number;
  day: number;
}

export function parseDate(date: CalendarDate): DateParts {
  const match = DATE_PATTERN.exec(date);
  if (!match) {
    throw new RangeError(
      `Not a YYYY-MM-DD calendar date: ${JSON.stringify(date)}`,
    );
  }
  const parts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
  // The pattern proves it is *shaped* like a date. This proves it is one.
  // 2026-04-31 and 2025-02-29 both pass the regex and both round-trip through
  // formatDate unchanged, so a round-trip check does not catch them — it only
  // catches padding. Accepting them would put a filing deadline on a day that
  // does not exist, which downstream arithmetic then silently slides.
  if (parts.month < 1 || parts.month > 12) {
    throw new RangeError(`Not a real calendar date: ${date}`);
  }
  if (parts.day < 1 || parts.day > daysInMonth(parts.year, parts.month)) {
    throw new RangeError(`Not a real calendar date: ${date}`);
  }
  return parts;
}

export function formatDate({ year, month, day }: DateParts): CalendarDate {
  const pad = (n: number, width = 2) => String(n).padStart(width, "0");
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

export function parseMonthDay(monthDay: MonthDay): { month: number; day: number } {
  const match = MONTH_DAY_PATTERN.exec(monthDay);
  if (!match) {
    throw new RangeError(`Not an MM-DD month/day: ${JSON.stringify(monthDay)}`);
  }
  return { month: Number(match[1]), day: Number(match[2]) };
}

/** Lexicographic comparison is chronological for `YYYY-MM-DD`. That is the point of the format. */
export function compareDates(a: CalendarDate, b: CalendarDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function isOnOrAfter(a: CalendarDate, b: CalendarDate): boolean {
  return compareDates(a, b) >= 0;
}

export function isOnOrBefore(a: CalendarDate, b: CalendarDate): boolean {
  return compareDates(a, b) <= 0;
}

/** Days in a month, honouring leap years. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Build a date, clamping the day to the end of the month.
 *
 * This is the behaviour filing deadlines actually want. An entity formed on
 * 31 January has its annual report due at the end of January, and in a scheme
 * that rolled the overflow forward it would silently move to 1 February — a
 * day late, every year, with nothing to notice it.
 */
export function dateInMonth(
  year: number,
  month: number,
  day: number | "last",
): CalendarDate {
  const last = daysInMonth(year, month);
  const clamped = day === "last" ? last : Math.min(day, last);
  return formatDate({ year, month, day: clamped });
}

/** Add months, clamping the day (31 Jan + 1 month = 28/29 Feb, not 3 March). */
export function addMonths(date: CalendarDate, months: number): CalendarDate {
  const { year, month, day } = parseDate(date);
  const zeroBased = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(zeroBased / 12);
  const targetMonth = (zeroBased % 12) + 1;
  return dateInMonth(targetYear, targetMonth, day);
}

export function addYears(date: CalendarDate, years: number): CalendarDate {
  return addMonths(date, years * 12);
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  const { year, month, day } = parseDate(date);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return formatDate({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  });
}

/** 0 = Sunday. */
export function dayOfWeek(date: CalendarDate): number {
  const { year, month, day } = parseDate(date);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function isWeekend(date: CalendarDate): boolean {
  const dow = dayOfWeek(date);
  return dow === 0 || dow === 6;
}

/**
 * Roll a weekend date forward to the following Monday.
 *
 * **Applied only where a rule opts in.** States genuinely differ: some statutes
 * say a deadline falling on a weekend moves to the next business day, others
 * say nothing and the agency's portal accepts a Monday filing anyway, and a few
 * treat the stated date as final. Rolling everything by default would invent a
 * legal position the rule data never claimed.
 *
 * Federal holidays are **not** handled. Doing it properly needs a per-
 * jurisdiction holiday calendar including state holidays, and a half-right
 * implementation is worse than an absent one: it would move some dates
 * correctly and leave others wrong, with no way to tell which from the output.
 * Tracked as future work; until then a rule may only ask for weekend rolling.
 */
export function rollForwardOffWeekend(date: CalendarDate): CalendarDate {
  const dow = dayOfWeek(date);
  if (dow === 6) return addDays(date, 2);
  if (dow === 0) return addDays(date, 1);
  return date;
}

/**
 * The previous business day, for an agency that wants the last business day
 * **of a period**.
 *
 * The distinction from rolling forward is not a preference, it is what the
 * statute says. WAC 434-120-140(2)(a) asks for Washington's charities renewal
 * "no later than the **last business day** of the eleventh month" — so when
 * the eleventh month ends on a Saturday, the deadline is the Friday **before**,
 * not the Monday after. Rolling the wrong way makes the product show a date up
 * to two days LATE, which is the direction that costs somebody a late fee.
 *
 * Same holiday caveat as its twin: a deadline landing on a legal holiday is
 * still wrong under both, and a half-right holiday implementation would be
 * worse than none because nothing in the output would say which dates it got
 * right.
 */
export function rollBackwardOffWeekend(date: CalendarDate): CalendarDate {
  const dow = dayOfWeek(date);
  if (dow === 6) return addDays(date, -1);
  if (dow === 0) return addDays(date, -2);
  return date;
}
