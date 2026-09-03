/**
 * The supporting-organisation question and the revocation notice, in a browser.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * The engine suite proves the arithmetic — a section 509(a)(3) supporting
 * organisation owes Form 990-EZ and never the e-Postcard, and an unanswered
 * question yields an indeterminate rule rather than a wrong date. None of that
 * is worth anything if the product never asks, and none of it is checkable
 * without a browser.
 *
 * The failure this file exists to catch is the one the sibling
 * `private-foundation.spec.ts` names: **refuse to decide, and give nobody a way
 * to resolve it.** A calendar that says "cannot tell yet" with no field behind
 * it is a dead end, and every unit test in this repo would pass while it
 * shipped.
 *
 * It also covers the automatic-revocation notice, which is the one thing on
 * this dashboard whose subject is losing exempt status rather than paying a
 * fee. `revocationNotice.test.ts` asserts the CONDITION against a hand-built
 * calendar; only a browser can say the panel is actually on the page.
 *
 * ## What it deliberately does NOT assert
 *
 * That the e-Postcard is absent from the page. The suite shares one database,
 * serially, across every spec file, and by the time this runs an earlier
 * entity legitimately has Form 990-N sitting in "cannot tell yet" — so a
 * page-wide absence check would be asserting something false about a different
 * organisation. The "not the e-Postcard" claim is proved at the engine tier,
 * against fixtures, where it can be scoped to one entity.
 */

import { expect, test } from "@playwright/test";

/**
 * A supporting organisation with SMALL receipts, which is the whole point.
 *
 * One with large receipts was already excluded from the e-Postcard on the
 * amount and would have looked fine before this change. Only a small one
 * distinguishes the fix from the defect — the same trap the foundation fixture
 * was shaped to avoid.
 *
 * Receipts under $200,000 and assets under $500,000, so the return it owes is
 * the 990-EZ rather than the full Form 990.
 */
const SUPPORTING_ORG = {
  name: "Whatcom Library Friends Trust",
  formedOn: "2012-06-18",
  homeJurisdiction: "US-WA",
  jurisdictions: "US, US-WA",
  fiscalYearEnd: "12-31",
  grossRevenue: "18000",
  totalAssets: "90000",
} as const;

test.describe.configure({ mode: "serial" });

test.describe("the supporting-organisation question", () => {
  test("the form asks it, and offers all three answers", async ({ page }) => {
    // Three options, not a checkbox. An unticked box posts nothing, so an
    // unanswered question and a deliberate "no" would arrive identically — and
    // a supporting organisation read as "no" is told to file the e-Postcard,
    // which it may not file at any receipts level.
    await page.goto("/entities/new");
    const question = page.getByLabel(/Supporting organisation/i);
    await expect(question).toBeVisible();

    const values = await question
      .locator("option")
      .evaluateAll((options) =>
        options.map((o) => (o as HTMLOptionElement).value),
      );
    expect(values).toEqual(["", "no", "yes"]);
  });

  test("it starts unanswered, rather than pre-answered for you", async ({
    page,
  }) => {
    await page.goto("/entities/new");
    await expect(page.getByLabel(/Supporting organisation/i)).toHaveValue("");
  });

  test("the prior-year receipts are asked for, and are optional", async ({
    page,
  }) => {
    // They exist because "gross receipts normally $50,000 or less" is an
    // average across three taxable years. Blank is a real answer — a new
    // organisation has no prior years — so a `required` attribute here would
    // make the form unfillable for exactly the organisations it is for.
    await page.goto("/entities/new");
    const previous = page.getByLabel(/Gross revenue, previous year/i);
    await expect(previous).toBeVisible();
    await expect(previous).not.toHaveAttribute("required", /.*/);
    await expect(
      page.getByLabel(/Gross revenue, two years before/i),
    ).toBeVisible();
  });

  test("a supporting organisation is given the 990-EZ", async ({ page }) => {
    await page.goto("/entities/new");
    await page.getByLabel("Name").fill(SUPPORTING_ORG.name);
    await page.getByRole("checkbox", { name: /501\(c\)\(3\)/ }).check();
    await page.getByLabel("Date formed").fill(SUPPORTING_ORG.formedOn);
    await page
      .getByLabel("Home jurisdiction")
      .fill(SUPPORTING_ORG.homeJurisdiction);
    await page.getByLabel("Registered in").fill(SUPPORTING_ORG.jurisdictions);
    await page.getByLabel("Fiscal year ends").fill(SUPPORTING_ORG.fiscalYearEnd);
    await page.getByLabel("Gross annual revenue").fill(SUPPORTING_ORG.grossRevenue);
    await page.getByLabel("Total assets").fill(SUPPORTING_ORG.totalAssets);
    await page
      .getByLabel(/Private foundation/i)
      .selectOption({ label: "No — a public charity" });
    await page
      .getByLabel(/Supporting organisation/i)
      .selectOption({ label: "Yes — a 509(a)(3) supporting organisation" });

    await page.getByRole("button", { name: /add|save|create/i }).click();
    await page.waitForURL((url) => !url.pathname.endsWith("/new"), {
      timeout: 30_000,
    });

    // End to end: through the form, the parser, the database column, the
    // migration's three states, and the engine. Nothing else in this suite
    // produces a 990-EZ, so this row can only be the entity just created.
    await page.goto("/");
    await expect(page.getByText(/990-EZ/).first()).toBeVisible();
  });

  test("an entity nobody has asked is told what is missing, in words", async ({
    page,
  }) => {
    // Not `needs isSupportingOrganization`. The row's whole job is to ask
    // somebody something they can answer, and a field name is not a question.
    // `describeMissingFacts` falls back to the raw identifier, so this is what
    // fails the day a fact ships without a label.
    await page.goto("/");
    await expect(
      page
        .getByText(/whether you are a 509\(a\)\(3\) supporting organisation/i)
        .first(),
    ).toBeVisible();
  });
});

test.describe("the automatic-revocation notice", () => {
  test("is on the calendar of an organisation that owes a federal return", async ({
    page,
  }) => {
    // 26 U.S.C. 6033(j). Every other deadline in the pack costs a late fee;
    // this one costs the organisation its charitable status, and until now it
    // lived only in a rule's `notes` field that no customer reads.
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /three missed years/i }),
    ).toBeVisible();
    await expect(page.getByText(/3 consecutive years/i).first()).toBeVisible();
  });

  test("says plainly that it is not a claim about the reader", async ({ page }) => {
    // Nothing in this product records what anybody filed in a prior year.
    // Implying otherwise would be a compliance claim on evidence we do not
    // have, which is worse than the silence this notice replaces.
    await page.goto("/");
    await expect(
      page.getByText(/nothing here knows what you have filed/i),
    ).toBeVisible();
  });

  test("cites the statute a reader can check", async ({ page }) => {
    await page.goto("/");
    const citation = page.getByRole("link", { name: /6033\(j\)/ });
    await expect(citation).toBeVisible();
    const href = await citation.getAttribute("href");
    expect(href).toMatch(/^https:\/\//);
    expect(new URL(href!).hostname.endsWith(".gov")).toBe(true);
  });
});

test("no fact identifier is ever rendered at a customer", async ({ page }) => {
  // The leak this repo has already shipped twice, in the shape it takes when a
  // developer is mid-debugging: the identifier they were reading in the code
  // goes straight onto the screen.
  //
  // `normalAnnualGrossReceiptsMinorUnits` is the one worth spelling out. It is
  // DERIVED, so nobody can supply it, and an evaluator that reported it in
  // `missingFacts` would render a question the form does not ask — a dead end
  // wearing the costume of honesty. `reportableInputsFor` maps it back to the
  // gross-revenue field, and this is what fails if that mapping is lost.
  await page.goto("/");
  const body = await page.locator("body").innerText();
  for (const identifier of [
    "isPrivateFoundation",
    "isSupportingOrganization",
    "normalAnnualGrossReceiptsMinorUnits",
    "grossRevenueMinorUnits",
    "grossRevenuePriorYear1MinorUnits",
    "totalAssetsMinorUnits",
  ]) {
    expect(body).not.toContain(identifier);
  }
});
