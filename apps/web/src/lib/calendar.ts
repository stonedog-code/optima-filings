import "server-only";
/**
 * The merged calendar: rule-derived obligations plus user-authored actions.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import {
  feeAmountText,
  feeExplanation,
  isAnnualExemptOrganizationReturn,
} from "@optima-compliance/engine";
import type { IndeterminateRule } from "@optima-compliance/engine";
import type { DatedItem } from "@optima-compliance/reminders";
import { bucket, type Bucketed } from "@optima-compliance/reminders";
import { allCalendars, getStore, today } from "./server";

/**
 * Everything with a due date, from both sources.
 *
 * The merge is the point of the feature. Someone who does not trust the rule
 * packs still needs one list, and someone who does still needs the deadlines the
 * engine cannot know about. Keeping two separate screens would mean neither
 * list is the answer to "what is coming up".
 *
 * `source` travels with every item so the UI can say which is which — a
 * deadline derived from a cited statute and one a person typed are different
 * kinds of claim, and rendering them identically overstates one of them.
 */
export function allDatedItems(asOf: string = today()): DatedItem[] {
  const fromRules: DatedItem[] = allCalendars(asOf, 36).flatMap(({ entity, result }) =>
    result.obligations.map((o) => ({
      id: `${o.ruleId}-${o.dueOn}`,
      title: o.title,
      dueOn: o.dueOn,
      source: "rule" as const,
      citation: o.citation,
      // Both URLs travel with the citation. Dropping them here is what made the
      // source unclickable in the shipped UI — the projection compiled fine,
      // the page looked complete, and the only symptom was text where a link
      // belonged.
      ...(o.citationUrl === undefined ? {} : { citationUrl: o.citationUrl }),
      ...(o.agencyUrl === undefined ? {} : { agencyUrl: o.agencyUrl }),
      status: o.status,
      // `ruleId` and `jurisdiction` travel for the same reason the two URLs do,
      // and they were dropped here for the same reason: the projection is
      // written field by field, so a field nobody names is silently absent and
      // nothing fails. `citationUrl` made exactly this trip and the only
      // symptom was plain text where a link belonged.
      //
      // Without these the UI cannot say which rule a row came from, which makes
      // a report about it a description rather than an identifier.
      ruleId: o.ruleId,
      jurisdiction: o.jurisdiction,
      // The fee makes the same trip, and it had never made it at all: the web
      // app has a `formatFee` with a test and NO caller, because no fee ever
      // reached a component. The cost of a filing was visible in the CLI, the
      // CSV and the calendar invite, and nowhere on the dashboard (NEH-403).
      ...(feeAmountText(o) === undefined ? {} : { fee: feeAmountText(o)! }),
      ...(feeExplanation(o) === undefined ? {} : { feeReason: feeExplanation(o)! }),
      entityId: entity.id,
    })),
  );

  const fromUser: DatedItem[] = getStore()
    .documents.listActions()
    .map((a) => ({
      id: a.id,
      title: a.title,
      dueOn: a.dueOn,
      source: "user" as const,
      ...(a.detail === undefined ? {} : { detail: a.detail }),
      ...(a.completedOn === undefined ? {} : { completedOn: a.completedOn }),
      ...(a.entityId === undefined ? {} : { entityId: a.entityId }),
      ...(a.documentId === undefined ? {} : { documentId: a.documentId }),
      ...(a.repeatAnnually ? { repeatAnnually: true } : {}),
    }));

  return [...fromRules, ...fromUser];
}

export interface MergedCalendar {
  bucketed: Bucketed;
  /**
   * Rules that cannot be decided because the entity is missing a fact.
   *
   * Carried alongside the buckets rather than folded into them: an
   * indeterminate rule has NO due date, so it cannot sit in a window — and
   * dropping it for that reason is exactly how a calendar comes to look
   * complete when it is not. This was lost when the dashboard moved to
   * reminder windows and had to be put back.
   */
  indeterminate: (IndeterminateRule & { entityName: string; entityId: string })[];
}

/**
 * Is anything on this calendar actually unverified?
 *
 * Exported and pure so the banner's condition can be asserted without
 * rendering a page — this repo has no component tier, and the alternative was
 * a condition tested only by a browser test that could not construct the case.
 *
 * ## Why this exists at all
 *
 * The banner used to render on `includeDraft()` — the FLAG, not the data. Those
 * were the same statement while the whole seed pack was `draft`: opting in
 * always did put unverified rows on screen. Since pack `2026.8.6` the shipped
 * set is entirely `active`, and `npm run dev` sets the flag, so a contributor
 * with no draft rules of their own was told "Unverified rules are being shown"
 * with every row on the page verified. NEH-1255.
 *
 * Crying wolf on an honesty surface is how the honesty surface stops being
 * read, and on a compliance product that surface is load-bearing.
 *
 * ## Both halves of the calendar, deliberately
 *
 * `indeterminate` rules carry `status` exactly as obligations do — they extend
 * the same `RuleProvenance` — and a draft one is just as unverified for having
 * no date. Counting only the dated items would let the banner miss the very
 * case the "Cannot tell yet" section exists to surface.
 */
export function hasDraftItems({ bucketed, indeterminate }: MergedCalendar): boolean {
  const dated = [
    ...bucketed.overdue,
    ...bucketed.later,
    // `windows` is a Record of arrays, not an array. A flat `.some()` over
    // `Object.values(bucketed)` skips it silently, which would drop the most
    // common case of all: an entity whose deadlines are merely upcoming.
    ...Object.values(bucketed.windows).flat(),
  ];
  return (
    dated.some((item) => item.status === "draft") ||
    indeterminate.some((rule) => rule.status === "draft")
  );
}

/**
 * Does this calendar contain a federal annual exempt-organisation return?
 *
 * Exported and pure for the same reason `hasDraftItems` is: this repo has no
 * component tier, so a condition asserted only by rendering a page is a
 * condition nothing tests. The notice it gates is the one warning on the
 * dashboard whose subject is losing exempt status rather than paying a fee.
 *
 * **Indeterminate rules count.** An organisation that has not answered the
 * foundation or supporting-organisation question still owes one of these
 * returns — the product simply cannot say which yet — and it is arguably the
 * reader who most needs telling. Counting only dated rows would hide the
 * warning from exactly the entity whose federal position is least settled.
 *
 * The rule ids come from `@optima-compliance/engine`, not from a prefix match
 * here, so the set is one both tiers share and one the rule-pack suite can
 * assert against what actually ships.
 */
export function hasAnnualExemptOrganizationReturn({
  bucketed,
  indeterminate,
}: MergedCalendar): boolean {
  const dated = [
    ...bucketed.overdue,
    ...bucketed.later,
    // `windows` is a Record of arrays. See `hasDraftItems` — a flat `.some()`
    // over `Object.values(bucketed)` skips it and drops the commonest case.
    ...Object.values(bucketed.windows).flat(),
  ];
  return (
    dated.some(
      (item) =>
        item.ruleId !== undefined && isAnnualExemptOrganizationReturn(item.ruleId),
    ) || indeterminate.some((rule) => isAnnualExemptOrganizationReturn(rule.ruleId))
  );
}

export function mergedCalendar(asOf: string = today()): MergedCalendar {
  // The id travels with the name because the row is only useful if it can point
  // at the screen that resolves it. Naming the entity tells a reader which one
  // is short a detail; the link is what lets them fix it.
  const indeterminate = allCalendars(asOf, 36).flatMap(({ entity, result }) =>
    result.indeterminate.map((rule) => ({
      ...rule,
      entityName: entity.name,
      entityId: entity.id,
    })),
  );
  return { bucketed: bucket(allDatedItems(asOf), asOf), indeterminate };
}
