/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Codegen only — this package emits no stylesheet.
 *
 * `@stonedogcode/style` ships TypeScript SOURCE that imports the CONSUMER's
 * generated `styled-system/*`. This package is a consumer, and had neither a
 * codegen step nor a path mapping — so `tsc --noEmit` followed those imports
 * into the dependency and could not resolve one of them, reporting 132 errors
 * none of which were in this package's own code (NEH-1174). A script that can
 * only be made green by editing somebody else's package measures nothing.
 *
 * The typings Panda emits depend on the PRESET, not on `include`, so this file
 * mirrors `apps/web/panda.config.ts` where it matters — the same three presets
 * and the same `--optima-*` namespace — and deliberately does not mirror the
 * extraction globs. Nothing here is bundled: the app runs its own codegen over
 * its own sources and emits the one stylesheet the product serves.
 */
import { defineConfig } from "@pandacss/dev";
import { stonedogStylePreset } from "@stonedogcode/style/preset";

export default defineConfig({
  preflight: false,
  presets: [
    "@pandacss/preset-base",
    "@pandacss/preset-panda",
    // NEH-170: our own --optima-* namespace, not the default --hopper-*.
    stonedogStylePreset({ cssVarPrefix: "optima" }),
  ],
  include: ["./src/**/*.{ts,tsx}"],
  outdir: "styled-system",
  jsxFramework: "react",
  emitPackage: false,
});
