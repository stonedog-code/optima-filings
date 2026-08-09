# @optima-compliance/export

Turn filing obligations into an **iCalendar** feed (RFC 5545) or a **CSV**
(RFC 4180).

Part of **[Optima Filings](https://github.com/stonedog-code/optima-filings)**.
It takes what [`@optima-compliance/engine`](https://www.npmjs.com/package/@optima-compliance/engine)
produces and renders it — so a deadline can leave the tool and land in the
calendar the person actually looks at.

```bash
npm install @optima-compliance/export
```

```ts
import { evaluate } from "@optima-compliance/engine";
import { ALL_RULES } from "@optima-compliance/rules";
import { toICalendar, toCsv } from "@optima-compliance/export";

const obligations = evaluate(entity, ALL_RULES, { asOf: "2026-08-09" });

const ics = toICalendar(obligations, {
  dtstamp: "20260809T120000Z",
  calendarName: "Bright Futures — filings",
  reminderDaysBefore: [30, 7],
});

const csv = toCsv(obligations);
```

## ⚠️ Read this before showing a date to anyone

The rules this renders currently ship as `status: "draft"` — written from
general knowledge, not checked against a statute by a person. This package
carries that caveat **into the calendar event itself**, because somebody reading
a reminder six months from now on their phone has no other way to know.

**Nothing here is legal or tax advice.** Every obligation cites its statute;
confirm the deadline and the fee with the agency before you file.

## It is pure and clock-free

`dtstamp` is a required parameter with no default, and nothing in this package
reads the clock — the same discipline the engine keeps. Two exports of the same
obligations produce byte-identical output, which is what makes the result
cacheable, diffable, and testable.

## The two details that matter

**Event UIDs are stable across corrections.** A UID is derived from the rule id
and the due date, and deliberately *not* from the title or the fee. A rule
corrected upstream therefore **updates** the event in a subscriber's calendar
instead of adding a second one beside it — the failure a user notices
immediately and never forgives.

**The CSV is safe to open in a spreadsheet.** A field beginning `=`, `+`, `-` or
`@` is a formula to Excel, Numbers and Sheets, and real statute citations begin
with `-`. Those fields are quoted and prefixed with an apostrophe, so a citation
stays a citation rather than becoming a broken cell — or a formula-injection
vector.

## API

| Export | What it does |
|---|---|
| `toICalendar(obligations, options)` | An RFC 5545 calendar. `options.dtstamp` is required; `calendarName` and `reminderDaysBefore` are optional |
| `toCsv(obligations)` | An RFC 4180 sheet, one row per obligation |
| `obligationUid(obligation)` | The stable UID for one occurrence, if you are building your own feed |
| `foldLine(line)` | RFC 5545 line folding, exported for callers assembling calendars by hand |

`reminderDaysBefore` is omitted by default rather than defaulted to one day: a
filing deadline you learn about on the day is nearly useless, because most
filings take longer than that to prepare. A caller that wants reminders should
ask for real notice.

## Licence

AGPL-3.0-only. Copyright © 2026 StoneDogCode L.L.C.
