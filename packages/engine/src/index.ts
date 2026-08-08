/**
 * @optima-compliance/engine — the compliance rules evaluator.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * ## The two constraints that define this package
 *
 * **Pure.** No filesystem, no network, no database, no `process.env`. Rules and
 * entity facts go in, obligations come out. That is what makes it testable
 * against thousands of fixtures, embeddable in a browser, and safe to expose
 * directly as the B2B API.
 *
 * **Clock-free.** Every entry point takes an explicit `asOf` date and nothing
 * here calls `Date.now()`. A compliance answer that depends on when it was
 * computed cannot be cached, cannot be reproduced in a bug report, and cannot
 * answer "what was due in 2024" — which real users need for late filings and
 * penalty calculations. There is a test that fails if `Date.now()` appears in
 * this package's source.
 *
 * Anything exported here is a public promise: the SaaS and third parties build
 * on it. Internals stay out of this file.
 */

export { evaluate } from "./evaluate.js";
export type {
  EvaluateOptions,
  EvaluationResult,
  Obligation,
  IndeterminateRule,
  RuleProvenance,
} from "./evaluate.js";

export { ENTITY_TYPES, CONDITIONABLE_FACTS, isEntityType } from "./facts.js";
export type {
  CalendarDate,
  ConditionableFact,
  EntityFacts,
  EntityType,
  Jurisdiction,
  MonthDay,
} from "./facts.js";

export { isConditionGroup } from "./rule.js";
export type {
  Cadence,
  ConditionOperator,
  Fee,
  Rule,
  RuleCondition,
  RuleConditionGroup,
  RuleConditionNode,
  RuleStatus,
} from "./rule.js";

export {
  addDays,
  addMonths,
  addYears,
  compareDates,
  dateInMonth,
  daysInMonth,
  dayOfWeek,
  formatDate,
  isOnOrAfter,
  isOnOrBefore,
  isWeekend,
  parseDate,
  parseMonthDay,
  rollForwardOffWeekend,
  rollBackwardOffWeekend,
} from "./calendar.js";
export type { DateParts } from "./calendar.js";
export {
  STALE_AFTER_MONTHS,
  isStale,
  monthsSinceVerified,
} from "./staleness.js";
export {
  DEFAULT_DOCUMENT_TYPE,
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_INFO,
  isDocumentType,
  requiresDocumentDate,
  toDocumentType,
} from "./documentTypes.js";
export type { DocumentType, DocumentTypeInfo } from "./documentTypes.js";
