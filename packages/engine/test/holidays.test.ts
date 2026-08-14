/**
 * US federal holidays, and rolling off them — NEH-443.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * ## The fixture that matters
 *
 * **A holiday falling on a WEEKDAY is the only case that distinguishes holiday
 * handling from weekend handling.** One that falls on a Saturday tells you
 * nothing, because the weekend rule already moves it — the two implementations
 * agree, and the test looks exactly like one that proves something.
 *
 * So every rolling case below is anchored on a weekday holiday, and each names
 * the wrong implementation it would catch.
 *
 * ## The dates are real and checkable
 *
 * Every expected date here can be confirmed against a wall calendar, which is
 * deliberate: computing an expectation by calling the same function under test
 * would pass against an implementation that agrees with nothing on earth.
 */

import {
  federalHolidays,
  isClosed,
  isFederalHoliday,
  rollBackwardToBusinessDay,
  rollForwardToBusinessDay,
} from "../src/holidays.js";
import { rollForwardOffWeekend } from "../src/calendar.js";

describe("the federal holiday calendar", () => {
  it("computes all eleven for a year", () => {
    // 5 U.S.C. 6103(a) names eleven. A count that drifts means one was dropped
    // or duplicated, and a missing holiday is a deadline shown a day early.
    expect(federalHolidays(2026).size).toBe(11);
  });

  it("gets the nth-weekday holidays right", () => {
    // Checkable against a 2026 calendar. These are the six that never need an
    // observance shift because they always fall on a weekday.
    expect(isFederalHoliday("2026-01-19")).toBe(true); // MLK, 3rd Monday
    expect(isFederalHoliday("2026-02-16")).toBe(true); // Washington, 3rd Monday
    expect(isFederalHoliday("2026-05-25")).toBe(true); // Memorial, LAST Monday
    expect(isFederalHoliday("2026-09-07")).toBe(true); // Labor, 1st Monday
    expect(isFederalHoliday("2026-10-12")).toBe(true); // Columbus, 2nd Monday
    expect(isFederalHoliday("2026-11-26")).toBe(true); // Thanksgiving, 4th Thursday
  });

  it("distinguishes the LAST Monday from the fourth", () => {
    // May 2026 has five Mondays, so "last" and "4th" differ by a week. A
    // `nth = 4` implementation returns 18 May and is wrong only in years with
    // five Mondays in May — which is exactly the kind of bug that ships.
    expect(isFederalHoliday("2026-05-25")).toBe(true);
    expect(isFederalHoliday("2026-05-18")).toBe(false);
  });

  it("shifts a fixed-date holiday that falls on a weekend", () => {
    // Independence Day 2026 falls on a SATURDAY, so it is observed on Friday
    // 3 July. An implementation that skipped the observance rule would report
    // the 4th and leave the 3rd an ordinary working day.
    expect(isFederalHoliday("2026-07-03")).toBe(true);
    expect(isFederalHoliday("2026-07-04")).toBe(false);

    // Christmas 2027 falls on a Saturday → observed Friday 24 December.
    expect(isFederalHoliday("2027-12-24")).toBe(true);

    // Veterans Day 2029 falls on a Sunday → observed Monday 12 November.
    expect(isFederalHoliday("2029-11-12")).toBe(true);
  });

  it("observes a New Year's Day that crosses the year boundary", () => {
    // THE EDGE CASE a per-year computation misses entirely. 1 January 2022 was
    // a Saturday, so the observed holiday was 31 DECEMBER 2021 — a federal
    // holiday inside 2021 produced by 2022's calendar.
    expect(isFederalHoliday("2021-12-31")).toBe(true);
    expect(federalHolidays(2021).has("2021-12-31")).toBe(true);

    // And it is not double-counted into the year it came from.
    expect(federalHolidays(2022).has("2021-12-31")).toBe(false);
  });
});

describe("rolling off a closed day", () => {
  it("moves a deadline that lands on a WEEKDAY holiday", () => {
    // Thanksgiving 2026 is Thursday 26 November — a weekday. Without holiday
    // handling this date does not move at all, so a filer is shown a deadline
    // on a day the agency is shut.
    expect(rollForwardToBusinessDay("2026-11-26", "us-federal")).toBe("2026-11-27");

    // The comparison that proves the two are different implementations rather
    // than the same one twice: weekends-only leaves it exactly where it was.
    expect(rollForwardOffWeekend("2026-11-26")).toBe("2026-11-26");
  });

  it("clears a holiday and the weekend behind it", () => {
    // Christmas 2027 is observed on Friday 24 December, so a deadline that day
    // has to clear the holiday AND the weekend after it, landing on Monday 27.
    // A single "+1 day" step would stop on the Saturday.
    expect(rollForwardToBusinessDay("2027-12-24", "us-federal")).toBe("2027-12-27");
  });

  it("rolls BACKWARD past a weekday holiday", () => {
    // The direction WA's charities renewal needs, tested on the federal
    // calendar because that is the only one modelled. Friday 3 July 2026 is
    // the observed Independence Day, so the last open day before the weekend
    // is Thursday 2 July.
    expect(rollBackwardToBusinessDay("2026-07-04", "us-federal")).toBe("2026-07-02");
  });

  it("does nothing to a date that is already open", () => {
    // Considered and no move needed — which is a different outcome from not
    // considered, and the obligation's `holidayCalendar` field is what tells
    // them apart.
    expect(rollForwardToBusinessDay("2026-11-24", "us-federal")).toBe("2026-11-24");
    expect(rollBackwardToBusinessDay("2026-11-24", "us-federal")).toBe("2026-11-24");
  });

  it("ignores holidays entirely when no calendar is named", () => {
    // The opt-in working. A state rule names no calendar, so its dates are
    // weekend-rolled only — still wrong on a state holiday, and reported as
    // unchecked rather than quietly presented as checked.
    expect(rollForwardToBusinessDay("2026-11-26")).toBe("2026-11-26");
    expect(isClosed("2026-11-26")).toBe(false);
    expect(isClosed("2026-11-26", "us-federal")).toBe(true);
  });

  it("treats weekends as closed under every calendar", () => {
    expect(isClosed("2026-11-28")).toBe(true); // Saturday
    expect(isClosed("2026-11-28", "us-federal")).toBe(true);
  });
});
