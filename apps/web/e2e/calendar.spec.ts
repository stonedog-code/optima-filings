/**
 * The Milestone 1 journey, in a browser.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * `docker run` → add an entity → see a correct compliance calendar. That is
 * the whole self-host deliverable, and until this file nothing had executed it.
 *
 * The entity here is the archetypal buyer from the project charter: a small
 * Washington 501(c)(3). Obviously fake, per the repo rule about fixtures in a
 * public repo.
 */

import { expect, test } from "@playwright/test";

const ENTITY = {
  name: "Cascade Trails Association",
  formedOn: "2021-03-15",
  homeJurisdiction: "US-WA",
  jurisdictions: "US, US-WA",
  fiscalYearEnd: "12-31",
} as const;

/**
 * Serial, because these steps are one journey rather than three tests: the
 * entity created in the first is what the later ones read. Playwright's default
 * isolation would otherwise give each a fresh context against a database that
 * still has the row, which is a confusing half-state.
 */
test.describe.configure({ mode: "serial" });

test.describe("the self-host journey", () => {
  test("starts with an honest empty state", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /compliance calendar/i }),
    ).toBeVisible();
  });

  test("an entity can be added", async ({ page }) => {
    await page.goto("/entities/new");

    await page.getByLabel("Name").fill(ENTITY.name);
    // A checkbox group, not a select — an entity can hold several legal forms
    // at once, and a 501(c)(3) is usually also a nonprofit corporation.
    await page.getByRole("checkbox", { name: /501\(c\)\(3\)/ }).check();
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

  test("its obligations render, with real dates", async ({ page }) => {
    await page.goto("/");

    // At least one obligation, and its due date rendered as an unambiguous
    // named month. The format matters: "03/04/2026" means two different days
    // depending on the reader, and this is a filing deadline.
    const dateCell = page
      .getByText(/\d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}/)
      .first();
    await expect(dateCell).toBeVisible();
  });

  test("every deadline carries its citation", async ({ page }) => {
    // A citation is what makes a deadline checkable, and the README tells users
    // to verify anything that matters — which is only possible if the source is
    // in front of them. A calendar that lost its citations would still look
    // right, which is why this is asserted rather than assumed.
    await page.goto("/");
    const citation = page.getByText(/RCW|USC|CFR|\bIRC\b|§/).first();
    await expect(citation).toBeVisible();

    // And it is a LINK, not just text. It rendered as plain text for as long as
    // this screen existed — `lib/calendar.ts` projected the obligation without
    // its `citationUrl`, so the page looked complete and the source was
    // unclickable. This assertion is what would have caught that.
    await expect(
      page.getByRole("link", { name: /RCW 24\.03A\.070/ }).first(),
    ).toBeVisible();
  });

  test("every deadline links to the agency, not only to the statute", async ({
    page,
  }) => {
    // The citation above answers "is this rule faithful to the law". This
    // answers "what is true today, and where do I file it" — and the statute
    // frequently cannot: RCW 23.95.255(4) hands the due date to the secretary
    // of state and names no date, and 8 Del. C. 502 sets no fee at all.
    //
    // Asserted as a real, resolvable link rather than as text, because a link
    // that renders but points nowhere is the failure mode: the row still looks
    // complete and trustworthy.
    await page.goto("/");
    const agencyLink = page
      .getByRole("link", { name: /Check the agency for the current fee and deadline/i })
      .first();
    await expect(agencyLink).toBeVisible();

    const href = await agencyLink.getAttribute("href");
    expect(href).toMatch(/^https:\/\//);
    // A .gov host. This is what stops a well-meaning edit pointing the link at
    // a compliance vendor's summary page — the one thing the rule-authoring
    // guide forbids outright, because copying a vendor imports their errors.
    expect(new URL(href!).hostname.endsWith(".gov")).toBe(true);
  });

  test("every deadline offers a way to say it is wrong", async ({ page }) => {
    // The self-hosted tier exists for people who would rather confirm a date
    // than take ours on trust. The agency link above is what lets them check —
    // this is what they need the moment the check disagrees, and without it the
    // report path exists only for somebody who reads the repository, which is
    // precisely the audience it is NOT for.
    await page.goto("/");
    const report = page.getByRole("link", { name: /Report this as wrong/i }).first();
    await expect(report).toBeVisible();

    const href = await report.getAttribute("href");
    const url = new URL(href!);
    // The issue FORM, not a blank issue. A blank issue from a non-developer is
    // prose with no jurisdiction and no source, and the project will not publish
    // a deadline nobody can check.
    expect(url.pathname).toBe("/stonedog-code/optima-filings/issues/new");
    expect(url.searchParams.get("template")).toBe("rule-change.yml");
  });

  test("the report link is prefilled from the row it sits on", async ({ page }) => {
    // Rendered, not unit-tested: the projection is where this breaks. `ruleId`
    // and `jurisdiction` are populated field by field in `allDatedItems`, so a
    // field nobody names is silently absent — exactly how `citationUrl` came to
    // render as unclickable text for as long as that screen existed.
    //
    // A unit test of the URL builder passes either way, because it is handed
    // the values directly. Only the browser sees what the row actually carried.
    await page.goto("/");
    const href = await page
      .getByRole("link", { name: /Report this as wrong/i })
      .first()
      .getAttribute("href");
    const params = new URL(href!).searchParams;

    expect(params.get("rule-id")).toMatch(/^us-/);
    expect(params.get("jurisdiction")).toBeTruthy();
    expect(params.get("filing")).toBeTruthy();
  });

  test("the report link carries nothing about the entity", async ({ page }) => {
    // The tracker is public and permanent, and this link is the ONLY path in
    // the self-hosted product that sends anything to a third party at all.
    // Everything else runs against the user's own SQLite file, which is the
    // tier's whole proposition.
    //
    // Asserted against the entity name this suite actually seeded, so it fails
    // on a real leak rather than on a placeholder nobody uses.
    await page.goto("/");
    const href = await page
      .getByRole("link", { name: /Report this as wrong/i })
      .first()
      .getAttribute("href");

    expect(href).not.toMatch(/entity/i);
    expect(decodeURIComponent(href!)).not.toMatch(new RegExp(ENTITY.name, "i"));
  });

  test("the disclaimer is visible next to the deadlines", async ({ page }) => {
    // Not a footer afterthought — this software tells people when to file with
    // the government, and the project file is explicit that the disclaimer is
    // structural. "Visible" is a claim only a browser can check.
    await page.goto("/");
    await expect(
      page.getByText(/not legal or tax advice/i).first(),
    ).toBeVisible();
  });

  test("does NOT cry wolf: no unverified banner when every rule is verified", async ({
    page,
  }) => {
    // This is the NEH-1255 regression, and it asserts an ABSENCE on purpose.
    //
    // The banner used to render on `OPTIMA_INCLUDE_DRAFT` — the flag this
    // suite sets, and the one `npm run dev` sets. While the whole seed pack
    // was `draft` that was indistinguishable from "a draft is on screen".
    // Since pack `2026.8.6` nothing shipped is, so the page said "Unverified
    // rules are being shown" over rows that were every one of them verified.
    //
    // The rows assertion is what stops this passing over an empty page: an app
    // that rendered nothing at all would also show no banner, and would be a
    // worse bug than the one being fixed.
    //
    // The POSITIVE half lives in `draft-rule.spec.ts`, against the second
    // server: a draft rule has to come from `OPTIMA_RULES_DIR`, because the
    // shipped pack is entirely `active` and promoting one back to `draft` to
    // give a test something to look at would mark a checked filing unverified.
    await page.goto("/");
    await expect(
      page.getByText(/Nonprofit Corporation Annual Report/i).first(),
    ).toBeVisible();
    await expect(page.getByText(/Unverified rules are being shown/i)).toHaveCount(
      0,
    );
  });
});

/**
 * Deadlines have to leave the tool or nobody sees them (NEH-211).
 *
 * These now **press the actual control**, which they could not when this file
 * was written: nothing in the UI linked to `/api/export`, so the export existed
 * and was undiscoverable (NEH-378). The route assertions are kept alongside the
 * click, because they answer different questions — one that the affordance is
 * there and works, the other that what it hands back is a real calendar.
 *
 * Note `page.goto` cannot be used for a download; it throws "Download is
 * starting" because the navigation never completes. A click with a `download`
 * event listener is the browser-faithful way, and `page.request` is right for
 * asserting a response nothing renders.
 */
test.describe("exports", () => {
  test("a person can find and press the export from the calendar", async ({
    page,
  }) => {
    // The half that was missing. A working route nobody can reach is not a
    // shipped feature, and only a browser test can tell the difference.
    await page.goto("/");

    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: /add to your calendar/i }).click();
    expect((await download).suggestedFilename()).toMatch(/\.ics$/);
  });

  test("the spreadsheet export is reachable too", async ({ page }) => {
    await page.goto("/");

    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: /spreadsheet/i }).click();
    expect((await download).suggestedFilename()).toMatch(/\.csv$/);
  });

  test("the calendar exports as iCal, with the headers that make it a file", async ({
    page,
  }) => {
    const response = await page.request.get("/api/export?format=ics");
    expect(response.status()).toBe(200);
    // The disposition is what turns a response into a saved file. Without it a
    // browser renders the calendar as text and the export silently does
    // nothing useful.
    expect(response.headers()["content-disposition"]).toMatch(/attachment/);
    expect(response.headers()["content-disposition"]).toMatch(/\.ics/);

    const body = await response.text();
    expect(body).toContain("BEGIN:VCALENDAR");
    // A UID per event is what lets a re-import update rather than duplicate.
    expect(body).toContain("UID:");
  });

  test("the calendar exports as CSV", async ({ page }) => {
    const response = await page.request.get("/api/export?format=csv");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toMatch(/text\/csv/);
    expect(response.headers()["content-disposition"]).toMatch(/\.csv/);
    // A header row and at least one obligation — an empty CSV is a successful
    // response that exports nothing.
    expect((await response.text()).trim().split("\n").length).toBeGreaterThan(1);
  });
});
