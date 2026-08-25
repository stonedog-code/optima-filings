/**
 * The questions jsdom structurally cannot answer.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * jsdom reports every element as a zero-sized box, so a test there will agree
 * that a 400px table fits a 375px screen, that nothing overflows, and that a
 * tap target is any size you like. These run at real viewports in a real
 * engine, which is the only place those claims mean anything.
 *
 * Both projects in the config run this file — `desktop` and a 375px `mobile` —
 * so the same assertions are made at both widths rather than at whichever one
 * happened to be convenient.
 */

import { expect, test } from "@playwright/test";

/**
 * A horizontal scrollbar on the document is the classic small-screen defect:
 * one wide table or one un-wrapped string, and the whole page slides sideways.
 * It is invisible in a unit test and immediately obvious to a person.
 *
 * The obligation table is *allowed* to scroll — it has `overflowX: auto` for
 * exactly that reason — but the page body is not.
 */
async function expectNoHorizontalPageScroll(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    // A pixel of tolerance: sub-pixel layout rounding is not a defect, and an
    // exact comparison would make this fail on nothing.
    return doc.scrollWidth - doc.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(1);
}

for (const path of ["/", "/entities/new", "/documents", "/documents/new"]) {
  test(`${path} does not scroll sideways`, async ({ page }) => {
    await page.goto(path);
    await expectNoHorizontalPageScroll(page);
  });
}

test("the primary heading is visible without scrolling", async ({ page }) => {
  await page.goto("/");
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toBeInViewport();
});

test("the first tab reaches an interactive control", async ({ page }) => {
  // The weaker claim, which does hold: focus goes somewhere real rather than
  // being lost. Focus order is unobservable in jsdom, so even this had never
  // been checked.
  await page.goto("/");
  await page.keyboard.press("Tab");
  const tag = await page.evaluate(() => document.activeElement?.tagName ?? "");
  expect(["A", "BUTTON", "INPUT", "SELECT"]).toContain(tag);
});

test("a skip link is the first thing keyboard focus reaches", async ({
  page,
}) => {
  // Was `test.fixme` when this suite landed — the app had no skip link at all
  // (NEH-379). The assertion is UNCHANGED; only the pin came off, which is the
  // property `fixme` was chosen for: a correct test that starts passing on its
  // own when the fix arrives, rather than one nobody re-adds.
  await page.goto("/");
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => {
    const el = document.activeElement;
    return { tag: el?.tagName ?? "", text: el?.textContent?.trim() ?? "" };
  });
  expect(focused.tag).toBe("A");
  expect(focused.text).toMatch(/skip/i);
});

test("the skip link becomes visible when focused", async ({ page }) => {
  // Off-screen until focused, then on-screen. `display:none` would also hide it
  // and would remove it from the accessible tree entirely — so the link would
  // stop existing for exactly the users it is for. The difference is
  // unobservable without a layout engine.
  await page.goto("/");
  const link = page.getByRole("link", { name: /skip to content/i });

  const offScreen = await link.boundingBox();
  expect(offScreen!.x).toBeLessThan(0);

  await page.keyboard.press("Tab");
  await expect(link).toBeInViewport();
});

test("following the skip link moves focus, not just the scroll position", async ({
  page,
}) => {
  // The half that is easy to get wrong and impossible to notice with a mouse.
  // A browser will not focus a non-focusable target, so without `tabindex="-1"`
  // on the destination the page scrolls, focus stays in the header, and the
  // next Tab continues through the navigation the user just asked to skip —
  // the link appears to work and does nothing.
  await page.goto("/");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");

  const focusedId = await page.evaluate(() => document.activeElement?.id ?? "");
  expect(focusedId).toBe("main");
});

test("the entity form can be completed with the keyboard alone", async ({
  page,
}) => {
  // Not a mouse click anywhere. A form that only works with a pointer is one a
  // screen-reader user cannot file with, and this product's whole job is
  // helping people meet deadlines.
  await page.goto("/entities/new");
  const name = page.getByLabel("Name");
  await name.focus();
  await page.keyboard.type("Keyboard Only Association");
  await expect(name).toHaveValue("Keyboard Only Association");
});

test("interactive controls are large enough to tap", async ({ page }) => {
  // Was `test.fixme` at 21px against a 24px floor. The assertion is UNCHANGED;
  // only the pin came off — the same property that made the skip-link test
  // above worth writing before the fix existed.
  //
  // WCAG 2.2 Target Size (Minimum), 2.5.8, is 24×24 CSS pixels. Measured, not
  // assumed: this is precisely the assertion a zero-sized jsdom box passes
  // while the real control is too small, which is why it went unnoticed.
  //
  // **The comment this replaces named the wrong cause, confidently.** It said
  // the button came from `@stonedogcode/style` so the fix belonged upstream and
  // affected HopperGuard too. It did not. The design system has enforced a
  // 48px floor since 2026-08-02, and the button's own markup asks for
  // `min-h_44px`; it measured 21px because this app never served the Panda
  // stylesheet at all (NEH-1173). The fix was one import here, not a package
  // release, and nothing about it touches HopperGuard.
  await page.goto("/entities/new");
  const submit = page.getByRole("button", { name: /add|save|create/i }).first();
  const box = await submit.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(24);
  expect(box!.width).toBeGreaterThanOrEqual(24);
});
