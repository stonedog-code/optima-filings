/**
 * Form → entity facts. Pure, so the validation is testable without a request.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { isEntityType, type EntityFacts, type EntityType } from "@optima-compliance/engine";

export type ParseResult =
  | { ok: true; facts: EntityFacts }
  | { ok: false; error: string };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_DAY = /^\d{2}-\d{2}$/;
const JURISDICTION = /^(US|US-[A-Z]{2}(\/[a-z0-9-]+)?)$/;

/**
 * Dollars → integer minor units.
 *
 * Rounds at the very end, on a value already scaled by 100, because
 * `parseFloat("1234.56") * 100` is `123455.99999999999` and truncating that
 * loses a cent. Money is integer minor units everywhere in this codebase; this
 * is the one place a human-entered decimal crosses into it.
 */
export function dollarsToMinorUnits(input: string): number | undefined {
  const trimmed = input.trim();
  if (trimmed === "") return undefined;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return undefined;
  return Math.round(value * 100);
}

/**
 * A yes/no question that is allowed to go unanswered.
 *
 * **Not a checkbox, and that is the whole design.** A checkbox posts nothing
 * when unticked, so an unanswered box and a deliberate "no" arrive identically
 * — which is fine for `solicits`, where "no" is the safe reading, and wrong
 * here. A private foundation may never file the 990-N e-Postcard at any income
 * level, so reading an unanswered question as "not a foundation" is how the
 * engine came to name that return for one. Three states in, three states out;
 * anything unrecognised, including the empty string, is `undefined`.
 */
export function parseTriState(value: string): boolean | undefined {
  if (value === "yes") return true;
  if (value === "no") return false;
  return undefined;
}

export function parseEntityForm(form: FormData): ParseResult {
  const text = (key: string) => String(form.get(key) ?? "").trim();

  const name = text("name");
  if (!name) return { ok: false, error: "Name is required." };

  const entityTypes = form.getAll("entityTypes").map(String).filter(isEntityType);
  if (entityTypes.length === 0) {
    return { ok: false, error: "Choose at least one legal form." };
  }

  const formedOn = text("formedOn");
  if (!DATE.test(formedOn)) {
    return { ok: false, error: "Date formed must be a real date (YYYY-MM-DD)." };
  }

  const homeJurisdiction = text("homeJurisdiction").toUpperCase();
  if (!JURISDICTION.test(homeJurisdiction)) {
    return {
      ok: false,
      error: `Home jurisdiction "${homeJurisdiction}" is not a recognised code. Use a form like US-WA.`,
    };
  }

  const jurisdictions = text("jurisdictions")
    .split(",")
    .map((part) => part.trim().toUpperCase())
    .filter(Boolean);
  if (jurisdictions.length === 0) {
    return { ok: false, error: "List at least one jurisdiction you are registered in." };
  }
  const bad = jurisdictions.find((j) => !JURISDICTION.test(j));
  if (bad) {
    return {
      ok: false,
      error: `"${bad}" is not a recognised jurisdiction code. Use US for federal, or a form like US-WA.`,
    };
  }
  // A rule only applies if its jurisdiction is listed, so a home state missing
  // from the list would silently drop every state filing. Adding it is what the
  // user meant, and a validation error here would just be pedantry.
  if (!jurisdictions.includes(homeJurisdiction)) jurisdictions.push(homeJurisdiction);

  const fiscalYearEnd = text("fiscalYearEnd");
  if (!MONTH_DAY.test(fiscalYearEnd)) {
    return { ok: false, error: "Fiscal year end must be MM-DD, e.g. 12-31." };
  }
  const [month, day] = fiscalYearEnd.split("-").map(Number);
  if (month! < 1 || month! > 12 || day! < 1 || day! > 31) {
    return { ok: false, error: `"${fiscalYearEnd}" is not a real month and day.` };
  }

  const isPrivateFoundation = parseTriState(text("isPrivateFoundation"));

  const grossRevenueMinorUnits = dollarsToMinorUnits(text("grossRevenue"));
  const totalAssetsMinorUnits = dollarsToMinorUnits(text("totalAssets"));
  const charitableAssetsMinorUnits = dollarsToMinorUnits(text("charitableAssets"));

  return {
    ok: true,
    facts: {
      name,
      entityTypes: entityTypes as EntityType[],
      formedOn,
      homeJurisdiction,
      jurisdictions,
      fiscalYearEnd,
      // Omitted, not zeroed, when blank. The engine reports a rule it cannot
      // decide as indeterminate; a 0 would read as "earned nothing" and quietly
      // qualify a large charity for the postcard return.
      ...(grossRevenueMinorUnits !== undefined ? { grossRevenueMinorUnits } : {}),
      ...(totalAssetsMinorUnits !== undefined ? { totalAssetsMinorUnits } : {}),
      ...(charitableAssetsMinorUnits !== undefined
        ? { charitableAssetsMinorUnits }
        : {}),
      // An unticked box is genuinely "no", not "unknown" — the checkbox is
      // always present in the submission.
      solicitsCharitableContributions: form.get("solicits") === "true",
      ...(isPrivateFoundation === undefined ? {} : { isPrivateFoundation }),
    },
  };
}
