/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import {
  addDays,
  addMonths,
  addYears,
  dateInMonth,
  daysInMonth,
  dayOfWeek,
  isWeekend,
  parseDate,
  parseMonthDay,
  rollForwardOffWeekend,
  rollBackwardOffWeekend,
} from "../src/calendar.js";

describe("parseDate", () => {
  it("reads the parts with a 1-based month", () => {
    // Not `Date`'s 0-11. That offset is a classic source of off-by-one-month
    // defects, and a filing due a month early is indistinguishable from a bug
    // in the rule data.
    expect(parseDate("2026-03-09")).toEqual({ year: 2026, month: 3, day: 9 });
  });

  it.each(["2026-3-9", "26-03-09", "2026/03/09", "", "not a date"])(
    "rejects the malformed date %s",
    (input) => {
      expect(() => parseDate(input)).toThrow(RangeError);
    },
  );

  it.each(["2026-02-30", "2025-02-29", "2026-13-01", "2026-04-31"])(
    "rejects %s, which is well-formed but not a real day",
    (input) => {
      expect(() => parseDate(input)).toThrow(/Not a real calendar date/);
    },
  );

  it("accepts a real leap day", () => {
    expect(parseDate("2024-02-29").day).toBe(29);
  });
});

describe("daysInMonth", () => {
  it.each([
    [2026, 1, 31],
    [2026, 2, 28],
    [2024, 2, 29],
    [2000, 2, 29],
    [1900, 2, 28],
    [2026, 4, 30],
  ])("%d-%d has %d days", (year, month, expected) => {
    expect(daysInMonth(year, month)).toBe(expected);
  });
});

describe("dateInMonth", () => {
  it("clamps a day past the end of the month rather than rolling over", () => {
    // The behaviour filing deadlines want. An entity formed on 31 January has
    // its report due at the end of January; rolling to 1 February would be one
    // day late, every year, with nothing to notice it.
    expect(dateInMonth(2026, 2, 31)).toBe("2026-02-28");
    expect(dateInMonth(2024, 2, 31)).toBe("2024-02-29");
  });

  it('resolves "last" to the real end of the month', () => {
    expect(dateInMonth(2026, 4, "last")).toBe("2026-04-30");
    expect(dateInMonth(2024, 2, "last")).toBe("2024-02-29");
  });
});

describe("addMonths", () => {
  it("clamps rather than overflowing into the next month", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
  });

  it("crosses a year boundary", () => {
    expect(addMonths("2026-11-15", 3)).toBe("2027-02-15");
  });

  it("goes backwards", () => {
    expect(addMonths("2026-01-15", -2)).toBe("2025-11-15");
  });

  it("lands on the leap day when the target year has one", () => {
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
  });

  it("is not always reversible, and that is correct", () => {
    // 31 Jan -> 28 Feb -> 28 Jan. Clamping loses information by design; a
    // scheme that "restored" the 31st would have to remember the original day
    // and would then disagree with every agency's published deadline.
    expect(addMonths(addMonths("2026-01-31", 1), -1)).toBe("2026-01-28");
  });
});

describe("addYears", () => {
  it("moves a leap day to the 28th in a common year", () => {
    expect(addYears("2024-02-29", 1)).toBe("2025-02-28");
  });
});

describe("addDays", () => {
  it("crosses a month boundary", () => {
    expect(addDays("2026-01-30", 3)).toBe("2026-02-02");
  });

  it("crosses a leap day", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2025-02-28", 1)).toBe("2025-03-01");
  });

  it("crosses a year boundary in both directions", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("dayOfWeek", () => {
  it("puts Sunday at 0", () => {
    // 2026-08-02 is a Sunday.
    expect(dayOfWeek("2026-08-02")).toBe(0);
    expect(dayOfWeek("2026-08-01")).toBe(6);
    expect(dayOfWeek("2026-08-03")).toBe(1);
  });

  it("agrees with isWeekend", () => {
    expect(isWeekend("2026-08-01")).toBe(true);
    expect(isWeekend("2026-08-02")).toBe(true);
    expect(isWeekend("2026-08-03")).toBe(false);
  });
});

describe("rollForwardOffWeekend", () => {
  it("moves Saturday to Monday", () => {
    expect(rollForwardOffWeekend("2026-08-01")).toBe("2026-08-03");
  });

  it("moves Sunday to Monday", () => {
    expect(rollForwardOffWeekend("2026-08-02")).toBe("2026-08-03");
  });

  it("leaves a weekday alone", () => {
    expect(rollForwardOffWeekend("2026-08-03")).toBe("2026-08-03");
  });
});

describe("parseMonthDay", () => {
  it("reads MM-DD", () => {
    expect(parseMonthDay("06-30")).toEqual({ month: 6, day: 30 });
  });

  it.each(["6-30", "2026-06-30", ""])("rejects %s", (input) => {
    expect(() => parseMonthDay(input)).toThrow(RangeError);
  });
});

describe("rollBackwardOffWeekend", () => {
  // The mirror of its twin, for an agency that asks for the last business day
  // OF A PERIOD rather than the next business day AFTER a date.
  it("moves a Saturday back one day, to Friday", () => {
    expect(rollBackwardOffWeekend("2026-08-01")).toBe("2026-07-31");
  });

  it("moves a Sunday back two days, to Friday", () => {
    expect(rollBackwardOffWeekend("2026-08-02")).toBe("2026-07-31");
  });

  it("leaves a weekday alone", () => {
    expect(rollBackwardOffWeekend("2026-08-03")).toBe("2026-08-03");
  });

  it("crosses a month boundary, and a year boundary", () => {
    // 1 August is a Saturday, so the answer is in July — the case a naive
    // implementation clamping within the month would get wrong.
    expect(rollBackwardOffWeekend("2026-08-01")).toBe("2026-07-31");
    // 1 January 2028 is a Saturday.
    expect(rollBackwardOffWeekend("2028-01-01")).toBe("2027-12-31");
  });

  it("is the opposite of rolling forward, on the same input", () => {
    // Stated as a relationship, because the whole defect was picking the wrong
    // one of the two. If these ever agree on a weekend date, one is broken.
    for (const weekend of ["2026-08-01", "2026-08-02"]) {
      expect(rollBackwardOffWeekend(weekend)).not.toBe(rollForwardOffWeekend(weekend));
      expect(rollBackwardOffWeekend(weekend) < weekend).toBe(true);
      expect(rollForwardOffWeekend(weekend) > weekend).toBe(true);
    }
  });
});
