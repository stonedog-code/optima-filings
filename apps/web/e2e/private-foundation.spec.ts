/**
 * The private-foundation question, in a browser — NEH-1146.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * The engine suite proves the arithmetic: a foundation owes Form 990-PF and
 * never the 990-N e-Postcard, and an unanswered question yields an
 * indeterminate rule rather than a wrong date. None of that is worth anything
 * if the product never asks.
 *
 * That is the failure this tier exists to catch here, and it has a name in the
 * issue: **option 3 — refuse to decide, and give nobody a way to resolve it.**
 * A calendar that says "cannot tell yet" with no field behind it is not honesty,
 * it is a dead end, and every unit test in this repo would pass while it shipped.
 * Whether a control exists on a page, whether its options are the three states,
 * and whether the link out of the undecided row lands somewhere that can answer
 * it are all claims only a browser can settle.
 *
 * A separate file from `calendar.spec.ts` because it seeds its own entities.
 * Those run serially against one database by design, so this appends to that
 * state rather than assuming an empty one.
 */

import { expect, test } from "@playwright/test";

/**
 * A foundation with SMALL receipts, which is the whole point.
 *
 * The bug was that receipts and assets decided the 990 family on their own, so
 * a foundation over the $50,000 line was already excluded from 990-N on the
 * amount and would have looked fine throughout. Only a small one distinguishes
 * the fix from the defect.
 */
interface EntityFixture {
  readonly name: string;
  readonly formedOn: string;
  readonly homeJurisdiction: string;
  readonly jurisdictions: string;
  readonly fiscalYearEnd: string;
  readonly grossRevenue: string;
  readonly totalAssets: string;
}

const FOUNDATION: EntityFixture = {
  name: "Harbor Light Family Foundation",
  formedOn: "2015-04-02",
  homeJurisdiction: "US-WA",
  jurisdictions: "US, US-WA",
  fiscalYearEnd: "12-31",
  grossRevenue: "20000",
  totalAssets: "30000",
};

/** Identical, except that nobody answers the question. */
const UNANSWERED: EntityFixture = { ...FOUNDATION, name: "Harbor Light Trust" };

test.describe.configure({ mode: "serial" });

/**
 * The first "cannot tell yet" row that is undecided **for this reason**.
 *
 * Not simply the first row in the section. These specs share one database with
 * the rest of the suite and run twice, once per viewport, so by the time this
 * executes the section legitimately holds rows waiting on other facts entirely
 * — charitable assets, whether the organisation solicits. Taking `.first()`
 * blindly clicked through to an entity whose foundation question was already
 * answered, and the assertion failed on the mobile pass only. Filtering by the
 * copy is also the stricter test: it pins the row's own wording to the link
 * beside it, which is the pairing that makes the row actionable at all.
 */
function undecidedFoundationRow(page: import("@playwright/test").Page) {
  return page
    .locator("section")
    .filter({ hasText: /cannot tell yet/i })
    .first()
    .locator("li")
    .filter({ hasText: /whether you are a private foundation/i })
    .first();
}

async function fillEntity(
  page: import("@playwright/test").Page,
  entity: EntityFixture,
  foundationAnswer: string | null,
): Promise<void> {
  await page.goto("/entities/new");
  await page.getByLabel("Name").fill(entity.name);
  await page.getByRole("checkbox", { name: /501\(c\)\(3\)/ }).check();
  await page.getByLabel("Date formed").fill(entity.formedOn);
  await page.getByLabel("Home jurisdiction").fill(entity.homeJurisdiction);
  await page.getByLabel("Registered in").fill(entity.jurisdictions);
  await page.getByLabel("Fiscal year ends").fill(entity.fiscalYearEnd);
  await page.getByLabel("Gross annual revenue").fill(entity.grossRevenue);
  await page.getByLabel("Total assets").fill(entity.totalAssets);

  if (foundationAnswer !== null) {
    await page
      .getByLabel(/Private foundation/i)
      .selectOption({ label: foundationAnswer });
  }

  await page.getByRole("button", { name: /add|save|create/i }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/new"), {
    timeout: 30_000,
  });
}

test.describe("the private-foundation question", () => {
  test("the form asks it, and offers all three answers", async ({ page }) => {
    // Three options, not a checkbox. A checkbox has two states and this
    // question has three — yes, no, and nobody has been asked — and the third
    // is the one that has to survive the form, because reading an unticked box
    // as "not a foundation" is exactly the wrong answer this change removes.
    await page.goto("/entities/new");
    const question = page.getByLabel(/Private foundation/i);
    await expect(question).toBeVisible();

    const values = await question.locator("option").evaluateAll((options) =>
      options.map((o) => (o as HTMLOptionElement).value),
    );
    expect(values).toEqual(["", "no", "yes"]);
  });

  test("it starts unanswered, rather than pre-answered for you", async ({
    page,
  }) => {
    // A select whose first real option is silently pre-selected would answer
    // on the customer's behalf, which is the same defect one control lower
    // down. The empty value has to be the one showing.
    await page.goto("/entities/new");
    await expect(page.getByLabel(/Private foundation/i)).toHaveValue("");
  });

  test("a private foundation is given the 990-PF", async ({ page }) => {
    await fillEntity(page, FOUNDATION, "Yes — a private foundation");
    await page.goto("/");
    await expect(page.getByText(/990-PF/).first()).toBeVisible();
  });

  test("an unanswered entity is told what is missing, in words", async ({
    page,
  }) => {
    // Not `needs isPrivateFoundation`. The row's whole job is to ask somebody
    // something they can answer, and a field name is not a question.
    await fillEntity(page, UNANSWERED, null);
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /cannot tell yet/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/whether you are a private foundation/i).first(),
    ).toBeVisible();
  });

  test("and can get to the field that answers it", async ({ page }) => {
    // The difference between an honest "we cannot tell" and a dead end. This
    // is the assertion that would fail if the fact shipped without the
    // question, which is the shape the issue explicitly rejected.
    await page.goto("/");
    await undecidedFoundationRow(page)
      .getByRole("link", { name: /add that detail/i })
      .click();
    await page.waitForURL(/\/entities\/[^/]+\/edit$/, { timeout: 30_000 });

    // And the question is there, still unanswered — an edit screen that
    // silently defaulted it would answer on the customer's behalf the moment
    // they saved any other field.
    await expect(page.getByLabel(/Private foundation/i)).toHaveValue("");
  });

  test("answering it turns the undecided row into a deadline", async ({
    page,
  }) => {
    // The pair to the assertion above, and what stops "cannot tell yet" being
    // a place rules go to die: supplying the one missing fact has to produce a
    // real date, end to end, through the form and the database and the engine.
    await page.goto("/");
    await undecidedFoundationRow(page)
      .getByRole("link", { name: /add that detail/i })
      .click();
    await page.waitForURL(/\/entities\/[^/]+\/edit$/, { timeout: 30_000 });

    await page
      .getByLabel(/Private foundation/i)
      .selectOption({ label: "Yes — a private foundation" });
    await page.getByRole("button", { name: /save|update|add/i }).click();
    await page.waitForURL((url) => !url.pathname.endsWith("/edit"), {
      timeout: 30_000,
    });

    await page.goto("/");
    await expect(page.getByText(/990-PF/).first()).toBeVisible();
  });

  test("no fact identifier is ever rendered at a customer", async ({ page }) => {
    // The leak this repo has already shipped twice, in the shape it takes when
    // a developer is mid-debugging: the identifier they were reading in the
    // code goes straight onto the screen. `describeMissingFacts` has a
    // fallback that renders the raw name, so this is not hypothetical — it is
    // what happens the day somebody adds a fact and forgets its label.
    await page.goto("/");
    const body = await page.locator("body").innerText();
    for (const identifier of [
      "isPrivateFoundation",
      // Added with the fact. A list that covered five of the seven would go on
      // reading as a leak guard while the newest identifier — the one most
      // likely to have shipped without a label — was the one it did not check.
      "isSupportingOrganization",
      "normalAnnualGrossReceiptsMinorUnits",
      "grossRevenuePriorYear1MinorUnits",
      "grossRevenuePriorYear2MinorUnits",
      "grossRevenueMinorUnits",
      "totalAssetsMinorUnits",
      "charitableAssetsMinorUnits",
      "solicitsCharitableContributions",
      "employeeCount",
    ]) {
      expect(body).not.toContain(identifier);
    }
  });
});
