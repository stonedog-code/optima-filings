/**
 * A deadline the user wrote down themselves.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * The other half of every export. `Obligation` is what the engine DERIVED from
 * a cited statute; this is what a person read off a letter and typed in. Both
 * belong in the calendar file — see `toICalendar` — and they must not be
 * rendered as the same kind of claim.
 *
 * ## Declared here rather than imported from `@optima-compliance/reminders`
 *
 * `DatedItem` over there is a richer shape carrying `source`, `citation`,
 * `agencyUrl` and the rest, because it is the type a UI renders a MERGED list
 * from. This package needs the minimum a serialiser needs, and taking the
 * dependency would drag the reminder-window logic into every consumer of a CSV
 * writer.
 *
 * The structural overlap is deliberate: `DatedItem`'s user-authored half is
 * assignable to this, so the self-hosted dashboard hands its projection
 * straight over with no adapter.
 */

import type { Obligation } from "@optima-compliance/engine";

/**
 * The minimum a user-authored deadline needs to be serialised.
 *
 * No citation, no agency, no fee and no `lastVerified` — not because they were
 * forgotten, but because **this is not a claim the product makes.** An
 * obligation carries provenance so a reader can check it against the statute;
 * a reminder's provenance is "you wrote this", and inventing fields to make
 * the two look alike would be the overstatement the whole source distinction
 * exists to prevent.
 */
export interface CalendarAction {
  id: string;
  title: string;
  /** `YYYY-MM-DD`. A civil date, like `Obligation.dueOn`. */
  dueOn: string;
  detail?: string;
  /** `YYYY-MM-DD` when it was done, or absent while it is outstanding. */
  completedOn?: string;
}

/**
 * Which of the two an item is.
 *
 * Keyed on `ruleId`, which every `Obligation` carries and no `CalendarAction`
 * has. Deliberately NOT a `source` discriminator field: that would have to be
 * set by every caller, and a caller that set it wrongly would render a
 * user's note with a statute's authority — the one mistake this distinction
 * exists to prevent. A structural check cannot be set wrongly.
 */
export function isCalendarAction(item: Obligation | CalendarAction): item is CalendarAction {
  return !("ruleId" in item);
}
