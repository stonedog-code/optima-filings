/**
 * @optima-compliance/export — deadlines to calendar and spreadsheet formats.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Separate from both the engine and the CLI, deliberately. The engine stays
 * focused on evaluation, and the hosted service needs identical iCalendar
 * output for its calendar push — it can only consume published packages, since
 * code may not be copied across the licence boundary. A generator living in
 * `apps/cli` would have to be written a second time.
 *
 * Pure and clock-free, like the engine: `dtstamp` is a parameter, never read
 * from the clock.
 */

export { toICalendar, obligationUid, actionUid, foldLine } from "./ical.js";
export type { ICalendarOptions } from "./ical.js";
export { toCsv } from "./csv.js";
export { isCalendarAction } from "./action.js";
export type { CalendarAction } from "./action.js";
