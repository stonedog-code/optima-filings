/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * The app must both GENERATE the Panda stylesheet and IMPORT it — NEH-1173.
 *
 * Two commands, and only the first was ever run. `panda codegen` writes the
 * typings (`styled-system/css`, `/jsx`, `/recipes`, `/tokens`) and `panda
 * cssgen` writes `styled-system/styles.css`. `src/styles.css` declared the
 * Panda cascade layers and then imported nothing, so the layers were empty and
 * the 93 KB of rules that belonged in them was never produced, let alone
 * served. The build was green throughout, every Panda class was in the DOM,
 * and a submit button asking for `min-h_44px` measured 21px.
 *
 * ## Why this is a UNIT test as well as an E2E one
 *
 * `e2e/stylesheet.spec.ts` owns the claim that matters — the bytes reaching a
 * browser — and it is the only tier that can make it. But that tier needs a
 * production build and a browser, so it is the slow, late signal. These two
 * assertions are the cheap early one: they cannot tell you the stylesheet was
 * served, only that neither half of the wiring has been deleted, which is the
 * regression this bug actually was.
 *
 * Deliberately NOT asserted here: anything about the generated file's size or
 * contents. `styled-system/` is gitignored and `npm test` does not build it,
 * so a test reading it would be green over a missing file on a clean checkout —
 * which is the same class of nothing-check as the bug.
 */

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const WEB_ROOT = resolve(__dirname, "..");

const pkg = JSON.parse(
  readFileSync(join(WEB_ROOT, "package.json"), "utf8"),
) as { scripts: Record<string, string> };

const stylesCss = readFileSync(join(WEB_ROOT, "src", "styles.css"), "utf8");

describe("the Panda stylesheet is generated and imported (NEH-1173)", () => {
  it("generates it: prepare:panda runs cssgen, not only codegen", () => {
    // `codegen` alone produces typings and no stylesheet. That is exactly the
    // state this app shipped in, and it looks completely healthy: the imports
    // resolve, the types are right, the class names are correct.
    expect(pkg.scripts["prepare:panda"]).toContain("panda cssgen");
  });

  it("runs that step before every build and every dev server", () => {
    // The import below is unresolvable without it, so a build that skipped the
    // step would fail loudly rather than silently — but only if the step is
    // wired to the thing that builds.
    for (const hook of ["prebuild", "predev"]) {
      expect(pkg.scripts[hook]).toContain("prepare:panda");
    }
  });

  it("imports it: src/styles.css pulls in styled-system/styles.css", () => {
    expect(stylesCss).toContain('@import "../styled-system/styles.css"');
  });

  it("keeps the hand-written rules unlayered, so they still win", () => {
    // The ordering half. Panda emits into cascade layers; unlayered rules beat
    // layered ones regardless of specificity, which is what keeps `body {
    // margin: 0 }` and the `:focus-visible` outline in force now that a reset
    // and 600-odd recipe selectors have arrived. Wrapping them in a layer to
    // tidy up would hand the accessibility rules to whichever recipe was more
    // specific, with no other symptom.
    const afterImport = stylesCss.slice(
      stylesCss.indexOf('@import "../styled-system/styles.css"'),
    );
    // The only `@layer` in this file is the ordering statement at the top,
    // which is above the import. Nothing below it may open a layer block.
    expect(afterImport).not.toMatch(/@layer\s+[\w.]+\s*\{/);
    expect(afterImport).toContain(":focus-visible {");
  });
});
