/**
 * The per-row *unverified* badge, and the directory that makes it reachable —
 * NEH-1255.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * ## Two things this settles that nothing else could
 *
 * **That a rule can be added to a RUNNING install at all.** The rule packs are
 * inlined into a TypeScript barrel at build time, so until `OPTIMA_RULES_DIR`
 * there was no way for a self-hoster or a rule author to put a rule in front of
 * the product without rebuilding it. The server this file talks to differs from
 * the main one in exactly one environment variable, so anything that renders
 * here and not there came from that directory.
 *
 * **That the badge is per ROW.** `getByText(/unverified/i).first()` would pass
 * on the page-wide banner alone and prove nothing about the marker on the row,
 * which is the thing a reader actually uses to tell one deadline from another.
 * Every assertion below is scoped to a single list item, and each is paired
 * with the opposite claim about a VERIFIED row on the same page — a badge that
 * rendered on everything would satisfy a one-sided test perfectly.
 *
 * ## Why the fixture rules are fake and outside the pack
 *
 * The shipped pack is entirely `active` and must stay so. Promoting a real rule
 * back to `draft` would put an unverified marker on a filing a person has
 * checked, to make a test pass. The fixtures live in `e2e/fixtures/extra-rules`
 * and are loaded the way an operator's own rules are.
 *
 * This suite runs against its own server on its own database — see
 * `playwright.config.ts`, which explains why one server cannot hold both this
 * and the "does NOT cry wolf" absence assertion in `calendar.spec.ts`.
 */

import { expect, test } from "@playwright/test";

/** Obviously fake, per the repo rule about fixtures in a public repo. */
const ENTITY = {
  name: "Ravensdale Community Hall",
  formedOn: "2019-05-02",
  homeJurisdiction: "US-WA",
  jurisdictions: "US, US-WA",
  fiscalYearEnd: "12-31",
} as const;

/** From `e2e/fixtures/extra-rules/`. Neither of these ships. */
const DRAFT_FILING = "Example Fixture Draft Filing";
const DRAFT_UNDECIDABLE = "Example Fixture Draft Headcount Filing";
/** From the shipped pack, and `status: "active"`. The control. */
const VERIFIED_FILING = "Nonprofit Corporation Annual Report";

test.describe.configure({ mode: "serial" });

test.describe("a rule added to a running install", () => {
  test("an entity can be added", async ({ page }) => {
    await page.goto("/entities/new");

    await page.getByLabel("Name").fill(ENTITY.name);
    await page.getByRole("checkbox", { name: /nonprofit corporation/i }).check();
    await page.getByLabel("Date formed").fill(ENTITY.formedOn);
    await page.getByLabel("Home jurisdiction").fill(ENTITY.homeJurisdiction);
    await page.getByLabel("Registered in").fill(ENTITY.jurisdictions);
    await page.getByLabel("Fiscal year ends").fill(ENTITY.fiscalYearEnd);

    await page.getByRole("button", { name: /add|save|create/i }).click();

    await page.waitForURL((url) => !url.pathname.endsWith("/new"), {
      timeout: 30_000,
    });
    await expect(page.getByText(ENTITY.name).first()).toBeVisible();
  });

  test("a rule from OPTIMA_RULES_DIR reaches the calendar", async ({ page }) => {
    // The product gap, before it is the badge gap. This rule is in no build:
    // it was read off the disk by the server that is answering this request.
    await page.goto("/");

    await expect(page.getByText(DRAFT_FILING).first()).toBeVisible();
  });

  test("the shipped pack is still there alongside it", async ({ page }) => {
    // An extra-rules directory that REPLACED the pack rather than adding to it
    // would pass the test above and lose every verified filing — a calendar
    // that renders, looks complete, and is missing what the user came for.
    await page.goto("/");

    await expect(page.getByText(VERIFIED_FILING).first()).toBeVisible();
  });

  test("the draft row carries the unverified badge, ON THAT ROW", async ({ page }) => {
    await page.goto("/");

    // Scoped to the list item, so the page-wide banner cannot satisfy it. The
    // banner is a <div role="note">, not a listitem, and no amount of it being
    // on the page makes this locator match.
    const draftRow = page
      .getByRole("listitem")
      .filter({ hasText: DRAFT_FILING })
      .first();
    await expect(draftRow).toBeVisible();
    await expect(draftRow.getByText(/unverified/i)).toBeVisible();
  });

  test("a VERIFIED row on the same page carries no badge", async ({ page }) => {
    // The other direction, and the one that makes the test above mean
    // something. A badge rendered unconditionally would pass that assertion and
    // tell a reader nothing about which deadline anybody has checked.
    await page.goto("/");

    const verifiedRow = page
      .getByRole("listitem")
      .filter({ hasText: VERIFIED_FILING })
      .first();
    await expect(verifiedRow).toBeVisible();
    await expect(verifiedRow.getByText(/unverified/i)).toHaveCount(0);
  });

  test("an undecidable draft rule is badged in 'Cannot tell yet' too", async ({
    page,
  }) => {
    // The second place the marker is rendered, and it had no coverage at all.
    // An indeterminate rule carries `status` exactly as an obligation does and
    // is no more verified for having no date — a reader looking at a row that
    // says "we cannot tell yet" still needs to know nobody checked the rule
    // that raised the question.
    await page.goto("/");

    const undecidableRow = page
      .getByRole("listitem")
      .filter({ hasText: DRAFT_UNDECIDABLE })
      .first();
    await expect(undecidableRow).toBeVisible();
    await expect(undecidableRow.getByText(/unverified/i)).toBeVisible();
    // And it says what would settle it, rather than being a dead end.
    await expect(undecidableRow.getByText(/how many people you employ/i)).toBeVisible();
  });

  test("the banner appears when a draft really is on the page", async ({ page }) => {
    // The POSITIVE half of the NEH-1255 pair, unreachable from a browser until
    // there was a way to put a draft rule into a running install. Its negative
    // — no banner when every rule is verified — is asserted against the main
    // server in `calendar.spec.ts`.
    await page.goto("/");

    await expect(
      page.getByText(/Unverified rules are being shown/i).first(),
    ).toBeVisible();
  });
});
