/**
 * The federal annual return family, and the consequence of missing it.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * ## Why this is in the engine rather than in each consumer
 *
 * Two tiers render these deadlines, and a fact that matters this much cannot
 * live in whichever one happened to be edited. `DOCUMENT_TYPES` is here for the
 * same reason: a vocabulary mirrored in two places is a vocabulary that drifts,
 * and the half that drifts is the half nobody is looking at.
 *
 * What is here is only what is checkable against a statute — which rules are
 * annual exempt-organisation returns, how many consecutive years cost the
 * exemption, and where that is written. **The sentence a customer reads is not
 * here.** Copy belongs to the surface showing it; the engine has no opinion on
 * how a warning is worded.
 */

/**
 * The rule ids that are annual returns or notices under 26 U.S.C. 6033.
 *
 * Missing any one of these three years running revokes exempt status, so the
 * set is exactly the set 6033(j) counts against — not "the rules whose id looks
 * like a 990". That distinction will matter the first time a 990-series rule is
 * added that is not an annual return: Form 990-T reports unrelated business
 * income under section 511 and is not a 6033 return, so it would belong to the
 * pack and not to this list.
 *
 * `rule-packs.test.ts` asserts this list against what the pack actually ships,
 * in both directions, so a new annual return fails the suite rather than
 * quietly never triggering the warning.
 */
export const ANNUAL_EXEMPT_ORGANIZATION_RETURNS = [
  "us-federal-form-990",
  "us-federal-form-990-ez",
  "us-federal-form-990-n",
  "us-federal-form-990-pf",
] as const;

export type AnnualExemptOrganizationReturn =
  (typeof ANNUAL_EXEMPT_ORGANIZATION_RETURNS)[number];

/** Is this rule one whose non-filing counts toward automatic revocation? */
export function isAnnualExemptOrganizationReturn(ruleId: string): boolean {
  return (ANNUAL_EXEMPT_ORGANIZATION_RETURNS as readonly string[]).includes(
    ruleId,
  );
}

/**
 * Automatic revocation of exempt status for non-filing.
 *
 * 26 U.S.C. 6033(j)(1), added by the Pension Protection Act of 2006: an
 * organisation that "fails to file an annual return or notice required under
 * either subsection for 3 consecutive years" has its exempt status "considered
 * revoked on and after the date set by the Secretary for the filing of the
 * third annual return or notice". Reinstatement under 6033(j)(2) requires a
 * fresh exemption application; Rev. Proc. 2014-11 sets out the procedures and a
 * user fee applies.
 *
 * **This is a statement about the law, never about a particular organisation.**
 * Nothing in this product records what anybody filed in a prior year, so no
 * surface built on this may imply that a customer has missed anything. A
 * compliance tool telling somebody they are about to lose their exemption, on
 * evidence it does not have, is a worse failure than the silence this replaces.
 */
export const AUTOMATIC_REVOCATION = {
  consecutiveYears: 3,
  citation: "26 U.S.C. 6033(j)",
  citationUrl:
    "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section6033",
  agencyUrl: "https://www.irs.gov/charities-non-profits/automatic-revocation-of-exemption",
} as const;
