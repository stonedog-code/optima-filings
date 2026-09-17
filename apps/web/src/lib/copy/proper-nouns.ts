/**
 * The words Optima Filings' interface copy may capitalise mid-sentence.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Interface copy is sentence case (the "Copy" section of the
 * `@stonedogcode/style` README is the fleet-wide rule). The one exception is a
 * proper noun, and a word is a proper noun because it is listed here, not
 * because it feels important. "Compliance calendar" and "Meeting minutes"
 * describe what they hold, and this list is what stops them arguing their way
 * into capitals.
 *
 * `apps/web/test/support/copy-casing.ts` reads this list, and
 * `apps/web/test/copy-casing.test.ts` fails if a brand, government or
 * third-party entry is never used by this repo's code, so the list cannot fill
 * up with names added "just in case".
 *
 * Only RENDERED COPY is governed. Identifiers (package, repository and route
 * names such as `optima-filings`) are never renamed to match anything here.
 */

/** The company and the product, spelled as the wordmark spells them. */
export const BRAND_NAMES: readonly string[] = ["Optima Filings", "StoneDogCode"];

/** Governments, agencies and the forms they publish. */
export const GOVERNMENT_NAMES: readonly string[] = ["IRS", "Secretary of State"];

/** Other companies' and products' names, spelled as they spell them. */
export const THIRD_PARTY_NAMES: readonly string[] = [];

/**
 * Words English capitalises everywhere: days, months, places. Exempt from the
 * "must be used somewhere" check, because a calendar word is a name wherever
 * it appears.
 */
export const LANGUAGE_NAMES: readonly string[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Everything the guard treats as a name. Longest first, so a full name is
 * consumed before its prefix can be.
 */
export const PROPER_NOUNS: readonly string[] = [
  ...BRAND_NAMES,
  ...GOVERNMENT_NAMES,
  ...THIRD_PARTY_NAMES,
  ...LANGUAGE_NAMES,
].sort((a, b) => b.length - a.length);
