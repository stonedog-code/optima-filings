/**
 * Calendar and spreadsheet export.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { toCsv, toICalendar, type CalendarAction } from "@optima-compliance/export";
import { allCalendars, getStore, today } from "@/lib/server";

export const dynamic = "force-dynamic";

/**
 * Everything with a due date, from BOTH sources — NEH-1147.
 *
 * This route built its file from `result.obligations` alone, so every
 * user-authored action was silently absent from the `.ics` and the `.csv`. A
 * self-hoster who recorded "respond to this IRS letter by 15 September" saw it
 * on the dashboard and did not see it in the calendar they subscribed to, and
 * the export reported success either way.
 *
 * `lib/calendar.ts` has had the merged projection all along — `allDatedItems`,
 * which the dashboard uses — and its module comment states the intent this
 * route was violating: *"someone who does not trust the rule packs still needs
 * one list, and someone who does still needs the deadlines the engine cannot
 * know about."*
 *
 * The store is read directly rather than through `allDatedItems` because that
 * projection flattens both kinds into `DatedItem` for a UI, and the serialiser
 * needs to tell them apart — it renders a statute-backed obligation and a
 * personal note differently on purpose. `StoredAction` is structurally a
 * `CalendarAction` already, so this is a narrowing, not a conversion.
 */
function userActions(): CalendarAction[] {
  return getStore()
    .documents.listActions()
    .map((action) => ({
      id: action.id,
      title: action.title,
      dueOn: action.dueOn,
      ...(action.detail === undefined ? {} : { detail: action.detail }),
      ...(action.completedOn === undefined ? {} : { completedOn: action.completedOn }),
    }));
}

export function GET(request: Request) {
  const format = new URL(request.url).searchParams.get("format") ?? "ics";
  const asOf = today();
  const obligations = allCalendars(asOf).flatMap((c) => c.result.obligations);
  const items = [...obligations, ...userActions()];

  if (format === "csv") {
    return new Response(toCsv(items), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="optima-${asOf}.csv"`,
      },
    });
  }

  return new Response(
    toICalendar(items, {
      // asOf, not the clock, so re-downloading the same day yields a
      // byte-identical file. The UID is what makes a re-import update the
      // user's events rather than duplicating them; a moving DTSTAMP would not
      // break that, but a stable file is easier to reason about and to diff.
      dtstamp: `${asOf.replaceAll("-", "")}T000000Z`,
      calendarName: "Optima compliance",
      reminderDaysBefore: [30, 7],
    }),
    {
      headers: {
        "content-type": "text/calendar; charset=utf-8",
        "content-disposition": `attachment; filename="optima-${asOf}.ics"`,
      },
    },
  );
}
