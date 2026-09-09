/**
 * Facts the engine computes rather than the user supplying.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * ## Why a derived fact exists at all
 *
 * The rule pack's whole thesis is that a rule is data a reviewer can check
 * against a statute. A derived fact moves a piece of the regulation into code,
 * which is a cost, so it is only worth doing where the regulation itself is an
 * arithmetic definition rather than a threshold.
 *
 * Form 990-N eligibility is exactly that case. Rev. Proc. 2011-15 does not say
 * "gross receipts of $50,000 or less"; it says **normally** not more than
 * $50,000, and then spends a whole section defining what "normally" means. A
 * condition of the form `grossRevenueMinorUnits lte 5000000` is not a
 * simplification of that test - it is a different test, and it is wrong in both
 * directions.
 *
 * The precedent is `holidays.ts`, which encodes the eleven federal holidays of
 * 5 U.S.C. 6103(a) in code while the rule merely opts in by naming the
 * calendar. Same shape here: the rule names the threshold and the authority;
 * the engine computes the value the authority defines.
 */

import type { ConditionableFact, EntityFacts } from "./facts.js";

/** Every value a condition may be tested against, resolved for one entity. */
export type FactValues = Partial<Record<ConditionableFact, number | boolean>>;

/**
 * "Normally" annual gross receipts, per Rev. Proc. 2011-15 section 4.
 *
 * Verbatim, because encoding a regulation from memory is how a pack acquires a
 * threshold nobody can source:
 *
 * > For purposes of section 3 of this revenue procedure, the annual gross
 * > receipts of an organization are normally not more than $50,000 if -
 * > (1) in the case of an organization that has been in existence for one year
 * > or less, the organization's gross receipts, including amounts pledged by
 * > donors, are $75,000 or less during its first taxable year;
 * > (2) in the case of an organization that has been in existence for more than
 * > one year, but less than three years, the organization's average annual
 * > gross receipts for its first two taxable years is $60,000 or less; and,
 * > (3) in the case of an organization that has been in existence for three
 * > years or more, the organization's average annual gross receipts for the
 * > immediately preceding three taxable years, including the taxable year for
 * > which the return is filed, is $50,000 or less.
 *
 * ## What this implements, and what it does NOT
 *
 * It implements the **averaging** in all three tiers, over however many of the
 * three years the entity has supplied. It does **not** implement the tiered
 * dollar figures: every tier is compared against clause (3)'s $50,000 by the
 * rules that consume this value.
 *
 * That is a deliberate omission with a reason and a direction, not an oversight:
 *
 * - **Reason.** Which tier applies turns on how old the organisation is *in the
 *   taxable year being filed*. This engine resolves a rule's conditions once,
 *   before it computes that rule's due dates, and a single evaluation spans
 *   several filing years across the horizon. A year-dependent condition is
 *   therefore not expressible without restructuring `evaluate`, which is a
 *   larger change than a rule correction should smuggle in.
 * - **Direction.** $50,000 is the *strictest* of the three figures, so applying
 *   it to a one- or two-year-old organisation can only move that organisation
 *   onto a fuller return than it strictly owes. Over-filing is the error this
 *   pack chooses when it must choose one, and a Form 990-EZ is a return the IRS
 *   permits any small organisation to file voluntarily. The opposite
 *   simplification - applying $75,000 to everyone - would under-file, and is
 *   the reason this is written down rather than left as an obvious choice.
 *
 * ## Why fewer than three years is answered rather than refused
 *
 * A brand-new organisation has no prior years and never will; refusing to
 * decide would leave it permanently indeterminate, which is the one outcome
 * worse than an approximation. So the average is taken over the years supplied.
 *
 * The residual risk is stated plainly: an organisation that supplies only the
 * current year and had larger earlier years gets a *lower* normal figure than
 * the regulation would produce, which can under-file. That is not a regression
 * - it is exactly what this pack did for every organisation before prior years
 * existed at all - but it is the reason the entity form asks for them.
 *
 * ## Rounding
 *
 * `Math.ceil`, and it is not a fudge. The rules compare this value against an
 * integer threshold `T` with `lte` or `gt`, and for integer `T`,
 * `ceil(x) <= T` holds exactly when `x <= T`. So the ceiling is the exact
 * integer encoding of the real-valued comparison, not a conservative nudge.
 */
export function deriveNormalAnnualGrossReceipts(
  entity: EntityFacts,
): number | undefined {
  const current = entity.grossRevenueMinorUnits;
  // The current year is the one year clause (3) names explicitly ("including
  // the taxable year for which the return is filed"), so without it there is
  // nothing to average and the answer is genuinely unknown.
  if (current === undefined) return undefined;

  const years = [current];
  // Order matters: year 2 is only meaningful alongside year 1. Someone who
  // filled in the older box and left the newer one blank has told us less than
  // they think, and averaging a two-year gap as if it were consecutive would
  // invent a figure. Taking the run that starts at the current year is the
  // reading that cannot be wrong.
  if (entity.grossRevenuePriorYear1MinorUnits !== undefined) {
    years.push(entity.grossRevenuePriorYear1MinorUnits);
    if (entity.grossRevenuePriorYear2MinorUnits !== undefined) {
      years.push(entity.grossRevenuePriorYear2MinorUnits);
    }
  }

  const total = years.reduce((sum, year) => sum + year, 0);
  return Math.ceil(total / years.length);
}

/**
 * Every fact a condition may test, resolved for one entity.
 *
 * Built once per evaluation rather than looked up per condition, so a derived
 * fact is computed once and the evaluator stays a pure lookup. An absent key
 * means unknown, which is what makes a rule testing it come back indeterminate
 * rather than decided.
 */
export function deriveFactValues(entity: EntityFacts): FactValues {
  const normalAnnualGrossReceiptsMinorUnits =
    deriveNormalAnnualGrossReceipts(entity);

  return {
    ...(entity.grossRevenueMinorUnits !== undefined
      ? { grossRevenueMinorUnits: entity.grossRevenueMinorUnits }
      : {}),
    ...(entity.totalAssetsMinorUnits !== undefined
      ? { totalAssetsMinorUnits: entity.totalAssetsMinorUnits }
      : {}),
    ...(entity.charitableAssetsMinorUnits !== undefined
      ? { charitableAssetsMinorUnits: entity.charitableAssetsMinorUnits }
      : {}),
    ...(entity.employeeCount !== undefined
      ? { employeeCount: entity.employeeCount }
      : {}),
    ...(entity.solicitsCharitableContributions !== undefined
      ? {
          solicitsCharitableContributions:
            entity.solicitsCharitableContributions,
        }
      : {}),
    ...(entity.isPrivateFoundation !== undefined
      ? { isPrivateFoundation: entity.isPrivateFoundation }
      : {}),
    ...(entity.isSupportingOrganization !== undefined
      ? { isSupportingOrganization: entity.isSupportingOrganization }
      : {}),
    ...(entity.contributionsRaisedMinorUnits !== undefined
      ? { contributionsRaisedMinorUnits: entity.contributionsRaisedMinorUnits }
      : {}),
    ...(entity.allFundraisingUnpaid !== undefined
      ? { allFundraisingUnpaid: entity.allFundraisingUnpaid }
      : {}),
    ...(entity.assetsOrIncomeInureToInsiders !== undefined
      ? { assetsOrIncomeInureToInsiders: entity.assetsOrIncomeInureToInsiders }
      : {}),
    ...(entity.incomeProducingCharitableAssetsMinorUnits !== undefined
      ? {
          incomeProducingCharitableAssetsMinorUnits:
            entity.incomeProducingCharitableAssetsMinorUnits,
        }
      : {}),
    ...(normalAnnualGrossReceiptsMinorUnits !== undefined
      ? { normalAnnualGrossReceiptsMinorUnits }
      : {}),
  };
}

/**
 * What to tell the user to supply when a fact is unknown.
 *
 * A derived fact is not something anybody can answer, so reporting
 * `normalAnnualGrossReceiptsMinorUnits` in `missingFacts` would produce a row
 * that says "cannot tell yet" and names something the form does not ask. That
 * is precisely the dead end `IndeterminateRule` exists to avoid, so a derived
 * fact reports the input that would decide it instead.
 *
 * Only the current year is listed. The prior years refine the answer; they are
 * not required to produce one, and demanding data an organisation may not have
 * would trade a decided calendar for an empty one.
 */
const DERIVED_FACT_INPUTS: Partial<
  Record<ConditionableFact, readonly ConditionableFact[]>
> = {
  normalAnnualGrossReceiptsMinorUnits: ["grossRevenueMinorUnits"],
};

/** The fact names to report to a user when `fact` could not be resolved. */
export function reportableInputsFor(
  fact: ConditionableFact,
): readonly ConditionableFact[] {
  return DERIVED_FACT_INPUTS[fact] ?? [fact];
}
