import "server-only";
/**
 * The merged calendar: rule-derived obligations plus user-authored actions.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

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
