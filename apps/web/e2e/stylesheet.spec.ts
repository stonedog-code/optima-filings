/**
 * The design system's stylesheet is actually served — NEH-1173.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * ## This failure has no other symptom, which is why it needs its own guard
 *
 * `apps/web/src/styles.css` declared the Panda layers and nothing imported the
 * file those layers belong to; `panda cssgen` was never run. The build stayed
 * green. Every Panda class kept being written into the DOM. The 93 KB of CSS
 * behind them was generated and discarded, and the app served **609 bytes** of
 * hand-written rules.
 *
 * Nothing else in the suite could see that. `min-h_44px` was in the class
 * attribute, so a DOM assertion passed; the page rendered, so navigation and
 * form tests passed; the layout even survived, because `themeCss()` injects the
 * `--optima-*` properties separately and a few colours are set inline. The one
 * test that would have caught it — the tap-target check in `layout.spec.ts` —
 * was pinned `test.fixme` against an upstream defect that did not exist.
 *
 * So the assertions here are deliberately about the BYTES ON THE WIRE rather
 * than about any element: a rule that is not in the served stylesheet cannot
 * be observed to be missing by looking at markup.
 *
 * ## Both halves are load-bearing
 *
 * A size floor alone would pass on 93 KB of the wrong stylesheet. A class check
 * alone would pass on a stylesheet containing one rule. Together they say the
 * generated sheet, in something like its whole size, reached the browser.
 *
 * The floor is 20 KB — thirty times the broken 609 bytes and a quarter of the
 * ~77 KB actually served, so it is nowhere near tight enough to fail on a
 * component being removed, and nowhere near loose enough to pass on the bug.
 */

import { expect, test } from "@playwright/test";

/** Comfortably above the 609-byte failure, comfortably below the real ~77 KB. */
const MIN_STYLESHEET_BYTES = 20_000;

/**
 * Rules that only exist if the Panda output arrived, one from each of the two
 * places it can come from.
 *
 * `.button` is a RECIPE — `@stonedogcode/style`'s own component styling, and
 * the one that matters most here: it carries the `min-height: 48px` tap-target
 * floor the design system has enforced since 2026-08-02, which this app was
 * not receiving.
 *
 * `.min-h_44px` is a UTILITY, emitted because a call site asked for it. A
 * recipe could in principle be delivered by some other route; a utility class
 * named after its own value can only come from Panda's extraction.
 */
const REQUIRED_RULES = [".button", ".min-h_44px"];

test("the generated Panda stylesheet is actually served", async ({ page }) => {
  const response = await page.goto("/entities/new");
  expect(response?.ok()).toBe(true);

  const hrefs = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].map(
      (l) => l.href,
    ),
  );

  // The input-set size, printed rather than assumed. A page that linked no
  // stylesheet at all would otherwise fail the size assertion below for a
  // reason that reads as "the CSS shrank".
  console.log(`stylesheet links on /entities/new: ${hrefs.length}`);
  expect(hrefs.length).toBeGreaterThan(0);

  let css = "";
  for (const href of hrefs) {
    const sheet = await page.request.get(href);
    expect(sheet.ok()).toBe(true);
    css += await sheet.text();
  }

  console.log(`served stylesheet bytes: ${Buffer.byteLength(css, "utf8")}`);
  expect(Buffer.byteLength(css, "utf8")).toBeGreaterThan(MIN_STYLESHEET_BYTES);

  for (const rule of REQUIRED_RULES) {
    expect(css, `${rule} is missing from the served stylesheet`).toContain(
      `${rule}{`,
    );
  }
});

test("the hand-written rules still win over the design system's", async ({
  page,
}) => {
  // The ordering half of the fix. Panda emits into cascade layers and
  // `src/styles.css`'s own rules are UNLAYERED, so they beat anything layered
  // regardless of specificity — which is what keeps `body { margin: 0 }` and
  // the `:focus-visible` outline in force after 93 KB of reset and recipes
  // arrived. Wrapping those rules in a layer to "tidy up" would silently hand
  // the accessibility ones to whichever recipe was more specific, and nothing
  // else in the suite would notice.
  await page.goto("/");

  const bodyMargin = await page.evaluate(
    () => getComputedStyle(document.body).marginTop,
  );
  expect(bodyMargin).toBe("0px");
});
