/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { Obligation } from "@optima-compliance/engine";
import { actionUid, foldLine, obligationUid, toICalendar } from "../src/ical.js";
import { toCsv } from "../src/csv.js";
import { isCalendarAction, type CalendarAction } from "../src/action.js";

const DTSTAMP = "20260801T000000Z";

const obligation: Obligation = {
  ruleId: "us-wa-sos-nonprofit-annual-report",
  title: "Nonprofit Corporation Annual Report",
  agency: "Washington Secretary of State",
  jurisdiction: "US-WA",
  dueOn: "2026-03-31",
  feeMinorUnits: 6000,
  currency: "USD",
  citation: "RCW 24.03A.1010",
  status: "active",
  lastVerified: "2026-08-01",
};

const draft: Obligation = {
  ...obligation,
  ruleId: "us-wa-charitable-solicitation-registration",
  title: "Charitable Organization Registration Renewal",
  citation: "RCW 19.09.075; RCW 19.09.097",
  status: "draft",
  dueOn: "2026-11-30",
};

const ics = (items: (Obligation | CalendarAction)[], options = {}) =>
  toICalendar(items, { dtstamp: DTSTAMP, ...options });

/**
 * Undo RFC 5545 line folding.
 *
 * Content assertions must run against the unfolded text: a citation can be
 * split across a fold boundary, so searching the raw output for it fails even
 * when the escaping is perfectly correct. Asserting on raw output is how a test
 * ends up encoding the current line lengths rather than the behaviour.
 */
const unfold = (output: string) => output.replaceAll("\r\n ", "");

describe("toICalendar", () => {
  it("emits a well-formed calendar wrapper", () => {
    const output = ics([obligation]);
    expect(output.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(output.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(output).toContain("VERSION:2.0");
  });

  it("uses CRLF everywhere, never a bare LF", () => {
    // RFC 5545 §3.1. Some clients reject LF-only files outright; the ones that
    // accept them do so as a kindness.
    const output = ics([obligation, draft]);
    expect(output.replaceAll("\r\n", "")).not.toContain("\n");
  });

  it("carries a fee RANGE and its reason into the event description", () => {
    // The invite is the surface a person reads six months later, on a phone,
    // with no dashboard in front of them. Before NEH-403 this line divided by
    // 100 in place and silently dropped every inexact fee, so the calendar
    // showed no cost at all for the filings whose cost is hardest to guess.
    const output = ics([
      {
        ...obligation,
        feeMinorUnits: undefined,
        currency: "USD" as const,
        feeRange: {
          basis: "computed" as const,
          minimumMinorUnits: 22_500,
          maximumMinorUnits: 25_005_000,
          explanation: "Delaware computes this per corporation.",
          currency: "USD" as const,
        },
      },
    ]);
    // Unfolded, because iCalendar wraps long lines at 75 octets and the
    // assertion would otherwise fail on formatting rather than on content.
    const unfolded = unfold(output);

    // The thousands comma arrives ESCAPED — RFC 5545 gives `,` special meaning
    // inside a TEXT value, so `$250,050.00` must travel as `$250\,050.00` or a
    // parser reads it as two values. Asserting the escaped form is the honest
    // expectation; asserting the bare one would have quietly demanded a bug.
    expect(unfolded).toContain("Fee: $225.00 – $250\\,050.00");
    expect(unfolded).toContain("Delaware computes this per corporation");
  });

  it("is clock-free — identical inputs give byte-identical output", () => {
    // The reason dtstamp is a parameter. A clock here would make every export
    // differ from the last, so the file could not be diffed, cached, or
    // asserted on.
    expect(ics([obligation])).toBe(ics([obligation]));
  });

  it("writes deadlines as all-day events", () => {
    // A filing deadline is a civil date in the filing jurisdiction, not an
    // instant. A timed event lands on the wrong day for anyone whose calendar
    // is in another timezone.
    const output = ics([obligation]);
    expect(output).toContain("DTSTART;VALUE=DATE:20260331");
  });

  it("ends the event on the following day, because DTEND is exclusive", () => {
    // DTEND equal to DTSTART is a zero-length event, which several clients
    // silently refuse to display.
    expect(ics([obligation])).toContain("DTEND;VALUE=DATE:20260401");
  });

  it("rolls DTEND over a month boundary correctly", () => {
    expect(ics([draft])).toContain("DTEND;VALUE=DATE:20261201");
  });

  it("rolls DTEND over a leap day correctly", () => {
    const leap = { ...obligation, dueOn: "2024-02-29" };
    expect(ics([leap])).toContain("DTEND;VALUE=DATE:20240301");
  });
});

describe("UID stability", () => {
  it("keys on the rule and the occurrence, so recurrences are separate events", () => {
    expect(obligationUid(obligation)).toBe(
      "us-wa-sos-nonprofit-annual-report-2026-03-31@optimafilings.com",
    );
    expect(obligationUid({ ...obligation, dueOn: "2027-03-31" })).not.toBe(
      obligationUid(obligation),
    );
  });

  it("does NOT change when the rule's title, fee or status change", () => {
    // The property that makes re-import an update rather than a duplication.
    // Rules get corrected — that is the whole point of the project — and a UID
    // derived from mutable fields would duplicate the user's entire calendar
    // every time one did.
    const corrected: Obligation = {
      ...obligation,
      title: "Nonprofit Corporation Annual Report (renamed)",
      feeMinorUnits: 7500,
      status: "draft",
      lastVerified: "2027-01-01",
      citation: "RCW 24.03A.1010 (2027 amendment)",
    };
    expect(obligationUid(corrected)).toBe(obligationUid(obligation));
  });
});

describe("TEXT escaping", () => {
  it("escapes the semicolons and commas that appear in real citations", () => {
    // "RCW 19.09.075; RCW 19.09.097" — both characters are structural in
    // iCalendar, so this is load-bearing rather than defensive.
    expect(unfold(ics([draft]))).toContain("RCW 19.09.075\\; RCW 19.09.097");
  });

  it("escapes backslashes before anything else", () => {
    expect(unfold(ics([{ ...obligation, title: "A\\B" }]))).toContain("A\\\\B");
  });

  it("escapes newlines rather than breaking the content line", () => {
    const output = unfold(ics([{ ...obligation, title: "Line one\nLine two" }]));
    expect(output).toContain("Line one\\nLine two");
    expect(output).not.toContain("Line one\r\nLine two");
  });
});

describe("foldLine", () => {
  it("leaves a short line alone", () => {
    expect(foldLine("SUMMARY:short")).toBe("SUMMARY:short");
  });

  it("folds at 75 octets with CRLF and a leading space", () => {
    const folded = foldLine(`SUMMARY:${"x".repeat(200)}`);
    expect(folded).toContain("\r\n ");
    for (const line of folded.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });

  it("counts octets, not characters", () => {
    // Rule titles carry em dashes — 3 octets each in UTF-8. Folding on
    // character count emits lines that are legal by that measure and too long
    // by the real one.
    const folded = foldLine(`SUMMARY:${"—".repeat(40)}`);
    for (const line of folded.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });

  it("never splits a multi-byte character", () => {
    // A split mid-sequence produces mojibake in the importing client.
    const folded = foldLine(`SUMMARY:${"é".repeat(80)}`);
    expect(folded.replaceAll("\r\n ", "")).toBe(`SUMMARY:${"é".repeat(80)}`);
  });
});

describe("draft obligations carry their caveat into the calendar", () => {
  it("marks the summary", () => {
    expect(unfold(ics([draft]))).toContain("[unverified]");
  });

  it("explains it in the description", () => {
    // Someone reading this event in six months on their phone has no other way
    // to know the date was never checked against a statute.
    expect(unfold(ics([draft]))).toContain("UNVERIFIED");
  });

  it("says so on every event, and the disclaimer too", () => {
    expect(unfold(ics([obligation]))).toContain("Not legal or tax advice.");
  });

  it("does not mark a verified obligation", () => {
    expect(unfold(ics([obligation]))).not.toContain("[unverified]");
  });
});

describe("alarms", () => {
  it("are absent unless asked for", () => {
    expect(ics([obligation])).not.toContain("BEGIN:VALARM");
  });

  it("emit one VALARM per requested lead time", () => {
    const output = ics([obligation], { reminderDaysBefore: [30, 7] });
    expect(output).toContain("TRIGGER:-P30D");
    expect(output).toContain("TRIGGER:-P7D");
    expect(output.match(/BEGIN:VALARM/g)).toHaveLength(2);
  });
});

describe("toCsv", () => {
  it("writes a header row", () => {
    expect(toCsv([]).split("\r\n")[0]).toContain("due_on,jurisdiction,title");
  });

  it("keeps the original twelve columns at their original indices", () => {
    // A COMPATIBILITY CONTRACT, not a formatting preference (NEH-1147).
    //
    // `apps/cli` writes this to stdout, so somebody's `cut -d, -f2` is a
    // realistic consumer. Inserting a column mid-row would keep every such
    // script RUNNING while feeding it the wrong field — the widening was
    // reviewed and this is the flaw the review caught.
    //
    // Written as an exact positional list rather than `toContain`, so an
    // insertion anywhere in the run fails here rather than only at the seam.
    const columns = toCsv([]).split("\r\n")[0]!.split(",");

    expect(columns.slice(0, 12)).toEqual([
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
    ]);
  });

  it("appends the new columns after them, in the order they were added", () => {
    // UPDATED for NEH-403, which appended three inexact-fee columns. The
    // assertion is still exact and still positional — the point of it is that a
    // column may only ever be ADDED AT THE END, so it must fail on an insertion
    // and pass on an append. Loosening it to `toContain` would have let the
    // very insertion it guards against through, so it was widened rather than
    // relaxed, and the run below is the whole tail rather than a prefix of it.
    const columns = toCsv([]).split("\r\n")[0]!.split(",");
    expect(columns.slice(12)).toEqual([
      "source",
      "detail",
      "completed_on",
      "fee_minimum_minor_units",
      "fee_maximum_minor_units",
      "fee_explanation",
    ]);
  });

  it("leaves an obligation row's original twelve values where they were", () => {
    // The header staying put is half of it; the ROW has to match. A row built
    // from a different list than the header is the silent misalignment this
    // pair exists to catch.
    const values = toCsv([obligation]).split("\r\n")[1]!.split(",");

    expect(values.slice(0, 12)).toEqual([
      "2026-03-31",
      "US-WA",
      "Nonprofit Corporation Annual Report",
      "Washington Secretary of State",
      "",
      "6000",
      "USD",
      "RCW 24.03A.1010",
      "",
      "active",
      "2026-08-01",
      "us-wa-sos-nonprofit-annual-report",
    ]);
  });

  it("puts a RANGE in its own columns and leaves fee_minor_units empty", () => {
    // The column a reader sums must never hold a floor. `fee_minor_units` is
    // the original column and stays exact-only; the bounds and the reason are
    // appended columns, so a spreadsheet can budget from them without a total
    // that mixes a price with a minimum (NEH-403).
    const ranged = {
      ...obligation,
      feeMinorUnits: undefined,
      currency: "USD" as const,
      feeRange: {
        basis: "computed" as const,
        minimumMinorUnits: 22_500,
        maximumMinorUnits: 25_005_000,
        explanation: "Delaware computes this per corporation.",
        currency: "USD" as const,
      },
    };
    const columns = toCsv([]).split("\r\n")[0]!.split(",");
    const values = toCsv([ranged]).split("\r\n")[1]!.split(",");
    const cell = (name: string) => values[columns.indexOf(name)];

    expect(cell("fee_minor_units")).toBe("");
    expect(cell("fee_minimum_minor_units")).toBe("22500");
    expect(cell("fee_maximum_minor_units")).toBe("25005000");
    expect(values.join(",")).toContain("Delaware computes this per corporation");
  });

  it("leaves the range columns empty for an exact fee", () => {
    const columns = toCsv([]).split("\r\n")[0]!.split(",");
    const values = toCsv([obligation]).split("\r\n")[1]!.split(",");
    const cell = (name: string) => values[columns.indexOf(name)];

    expect(cell("fee_minor_units")).toBe("6000");
    expect(cell("fee_minimum_minor_units")).toBe("");
    expect(cell("fee_maximum_minor_units")).toBe("");
    expect(cell("fee_explanation")).toBe("");
  });

  it("names the fee unit in the header so nobody misreads 6000", () => {
    const output = toCsv([obligation]);
    expect(output).toContain("fee_minor_units");
    expect(output).toContain("6000");
  });

  it("quotes a field containing a comma", () => {
    const output = toCsv([
      { ...obligation, agency: "Secretary of State, Charities Program" },
    ]);
    expect(output).toContain('"Secretary of State, Charities Program"');
  });

  it("doubles an embedded quote", () => {
    const output = toCsv([{ ...obligation, title: 'The "Annual" Report' }]);
    expect(output).toContain('"The ""Annual"" Report"');
  });

  it("does not quote a field that does not need it", () => {
    // The output is read by humans in spreadsheets as often as by programs, and
    // a file where every cell is quoted is much harder to scan.
    expect(toCsv([obligation])).toContain(",US-WA,");
  });

  it("neutralises a leading character a spreadsheet would treat as a formula", () => {
    // Not hypothetical: citations legitimately begin with a hyphen in some
    // jurisdictions, and a spreadsheet reads that as the start of an expression.
    const output = toCsv([{ ...obligation, citation: "=SUM(A1:A9)" }]);
    expect(output).toContain(`"'=SUM(A1:A9)"`);
  });

  it("leaves an absent fee empty rather than writing 0", () => {
    // Zero would claim the filing is free; empty says nobody recorded a fee.
    const noFee = { ...obligation };
    delete noFee.feeMinorUnits;
    const dataRow = toCsv([noFee]).split("\r\n")[1]!;
    expect(dataRow).toContain(",,");
    expect(dataRow).not.toContain(",0,");
  });
});

describe("user-authored actions in the export — NEH-1147", () => {
  const action: CalendarAction = {
    id: "act-1",
    title: "Respond to the IRS letter",
    dueOn: "2026-09-15",
    detail: "Notice CP299 — confirm the e-Postcard was filed",
  };

  const done: CalendarAction = {
    id: "act-2",
    title: "File the annual report",
    dueOn: "2026-03-31",
    completedOn: "2026-03-20",
  };

  describe("iCalendar", () => {
    it("emits an event for every item of BOTH kinds", () => {
      // THE COUNT, not merely that the file parses. A fixture of obligations
      // alone passes against the code this replaces — the defect was that
      // actions were silently dropped, so only an assertion sensitive to how
      // many events came out can see it.
      const output = ics([obligation, draft, action, done]);
      expect(output.match(/BEGIN:VEVENT/g)).toHaveLength(4);
      expect(output.match(/END:VEVENT/g)).toHaveLength(4);
    });

    it("keeps action UIDs in their own namespace, so ids cannot collide", () => {
      const output = unfold(ics([action]));
      expect(output).toContain("UID:action-act-1@optimafilings.com");
      // An obligation UID is rule-id-and-date; an action's is prefixed. Without
      // the prefix an action id equal to a rule id would overwrite that event
      // in the importing client.
      expect(actionUid(action)).not.toBe(obligationUid(obligation));
    });

    it("keys an action UID on the id alone, so editing the date MOVES the event", () => {
      // Unlike an obligation, which recurs and keys on the date too. Keying an
      // action on its date would make correcting a typo create a second event
      // instead of moving the first.
      expect(actionUid({ ...action, dueOn: "2027-01-01" })).toBe(actionUid(action));
    });

    it("does not dress a personal note up as a statute-backed obligation", () => {
      const output = unfold(ics([action]));
      // No jurisdiction prefix, which is how an obligation's SUMMARY leads.
      expect(output).toContain(`SUMMARY:${action.title}`);
      expect(output).not.toContain("SUMMARY:US-WA:");
      expect(output).toContain("Your own reminder — not derived from a rule.");
      // The provenance an obligation carries must be absent, not blank.
      expect(output).not.toContain("Source: ");
      expect(output).not.toContain("Last verified:");
    });

    it("carries the disclaimer on a user action too", () => {
      expect(unfold(ics([action]))).toContain("Not legal or tax advice.");
    });

    it("marks a completed action rather than dropping it", () => {
      // iCalendar PUBLISH has no delete semantic, so omitting a completed
      // action leaves the event an earlier export created sitting on the user's
      // calendar still reading as due. Exporting it marked lets a re-import
      // correct the record — which is what the stable UID is for.
      const output = unfold(ics([done]));
      expect(output).toContain("SUMMARY:✓ File the annual report");
      expect(output).toContain("Completed: 2026-03-20");
    });

    it("does not set an alarm on something already done", () => {
      const output = ics([done], { reminderDaysBefore: [30, 7] });
      expect(output).not.toContain("BEGIN:VALARM");
    });

    it("still sets alarms on an outstanding action", () => {
      const output = ics([action], { reminderDaysBefore: [30, 7] });
      expect(output.match(/BEGIN:VALARM/g)).toHaveLength(2);
    });

    it("escapes an action's text like any other", () => {
      const nasty: CalendarAction = {
        id: "act-3",
        title: "Call the agency; ask about fees, forms",
        dueOn: "2026-05-01",
      };
      // RFC 5545 §3.3.11: both are structural in iCalendar, so both are
      // backslash-escaped. Written with doubled backslashes because this is a
      // JS string literal — a single one is an unknown escape and vanishes,
      // which would make the assertion pass against unescaped output.
      expect(unfold(ics([nasty]))).toContain(
        "SUMMARY:Call the agency\\; ask about fees\\, forms",
      );
    });
  });

  describe("CSV", () => {
    it("writes a row for every item of BOTH kinds", () => {
      const lines = toCsv([obligation, action, done]).trimEnd().split("\r\n");
      // Header plus three rows. Same reasoning as the event count above.
      expect(lines).toHaveLength(4);
    });

    it("names the source, so the two are not read as one kind of claim", () => {
      const lines = toCsv([obligation, action]).trimEnd().split("\r\n");
      const source = lines[0]!.split(",").indexOf("source");

      expect(source).toBeGreaterThan(-1);
      expect(lines[1]!.split(",")[source]).toBe("rule");
      expect(lines[2]!.split(",")[source]).toBe("user");
    });

    it("leaves the provenance columns empty on a user row rather than inventing them", () => {
      const [header, row] = toCsv([action]).trimEnd().split("\r\n");
      const columns = header!.split(",");
      const values = row!.split(",");

      for (const column of ["agency", "citation", "fee_minor_units", "rule_id", "last_verified"]) {
        expect(values[columns.indexOf(column)]).toBe("");
      }
      expect(values[columns.indexOf("source")]).toBe("user");
      expect(values[columns.indexOf("due_on")]).toBe("2026-09-15");
    });

    it("keeps every obligation column aligned after the widening", () => {
      // The header gained three columns, so an obligation row that was not
      // re-aligned would put the agency under `detail` — a spreadsheet that is
      // wrong rather than one that fails.
      const [header, row] = toCsv([obligation]).trimEnd().split("\r\n");
      const columns = header!.split(",");
      const values = row!.split(",");

      expect(values[columns.indexOf("agency")]).toBe("Washington Secretary of State");
      expect(values[columns.indexOf("jurisdiction")]).toBe("US-WA");
      expect(values[columns.indexOf("fee_minor_units")]).toBe("6000");
      expect(values[columns.indexOf("rule_id")]).toBe(obligation.ruleId);
      expect(values[columns.indexOf("source")]).toBe("rule");
    });

    it("neutralises a formula in an action's own fields too", () => {
      const injected: CalendarAction = {
        id: "act-4",
        title: "=HYPERLINK(\"http://evil\",\"click\")",
        dueOn: "2026-05-01",
      };
      expect(toCsv([injected])).toContain("\"'=HYPERLINK");
    });
  });

  it("classifies the two kinds structurally, with no flag a caller could set wrongly", () => {
    expect(isCalendarAction(action)).toBe(true);
    expect(isCalendarAction(obligation)).toBe(false);
  });
});
