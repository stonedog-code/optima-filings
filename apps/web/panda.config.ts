/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { defineConfig } from "@pandacss/dev";
import { stonedogStylePreset } from "@stonedogcode/style/preset";

export default defineConfig({
  preflight: true,
  /**
   * The base presets are listed EXPLICITLY, and that is load-bearing.
   *
   * Supplying a `presets` array REPLACES Panda's defaults instead of adding to
   * them. Omit these two and the recipes lose every token they lean on —
   * `gray.*`, `radii.xl`, the spacing scale — and Panda drops those
   * declarations SILENTLY: no build error, no console error, just wrong pixels.
   */
  presets: [
    "@pandacss/preset-base",
    "@pandacss/preset-panda",
    // NEH-170: our own --optima-* namespace, not the default --hopper-*.
    stonedogStylePreset({ cssVarPrefix: "optima" }),
  ],
  /**
   * @stonedogcode/style and @optima-compliance/ui ship TypeScript SOURCE, and Panda finds styles
   * by statically parsing files. A package it never parses contributes no CSS,
   * and its components then render with class names that have no rules behind
   * them — which looks like a broken stylesheet, not a missing glob.
   *
   * `@stonedogcode/style` is listed at TWO node_modules paths, and that is not
   * belt-and-braces — it is the only correct answer. Panda runs with cwd
   * `apps/web`, but npm workspaces HOIST, so whether the package lands in
   * `apps/web/node_modules` or in the repo-root one depends on version
   * conflicts elsewhere in the tree. Whichever is wrong today matches nothing,
   * silently; naming a single location is a config that is right in this
   * checkout and wrong in the next one. `test/panda-include.test.ts` asserts a
   * package is reachable by AT LEAST ONE of its globs for exactly this reason,
   * and prints which path matched.
   *
   * NEH-1004: this used to read `../../packages/stonedog-style/src/**\/*.tsx`,
   * the submodule that is now installed from the registry instead.
   */
  include: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
    "./node_modules/@stonedogcode/style/src/**/*.tsx",
    "../../node_modules/@stonedogcode/style/src/**/*.tsx",
  ],
  /**
   * The published tarball already omits `*.ct.tsx`, `*.harness.tsx` and
   * `__tests__/` (see the package's own `files` field), so these match nothing
   * against a registry install — and that is precisely why they must stay.
   *
   * The package is not always a tarball. Under `npm link`, or if it is ever
   * re-added as a workspace member for co-development, `node_modules/@stonedogcode/style`
   * is a symlink to a full source checkout, and 65 spec and harness files enter
   * the extraction surface — styles written to exercise a component, emitted
   * into the product stylesheet. Deleting a pattern because it matches nothing
   * today is how that becomes a surprise on the day somebody links the package.
   */
  exclude: [
    "**/*.ct.tsx",
    "**/*.harness.tsx",
    "**/__tests__/**",
  ],
  outdir: "styled-system",
  jsxFramework: "react",
});
