/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * The packages ship as ESM with NodeNext resolution, so their intra-package
 * imports carry `.js` extensions that point at TypeScript sources during a test
 * run. `moduleNameMapper` strips them; without it every import fails with
 * "Cannot find module './facts.js'".
 *
 * Tests themselves compile to CommonJS (see tsconfig.test.json) — that is a
 * test-harness choice and does not affect what the packages emit.
 */
export default {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/packages", "<rootDir>/apps"],
  /**
   * Next's `standalone` output traces a COPY of every workspace package into
   * .next/. Jest's module map then finds two packages claiming the name
   * `@optima-compliance/engine` and refuses to resolve either — a failure that reads as a
   * broken import and is actually a stale build artifact.
   */
  modulePathIgnorePatterns: ["<rootDir>/apps/web/.next/", "<rootDir>/apps/web/styled-system/"],
  testMatch: ["**/test/**/*.test.ts"],
  moduleNameMapper: {
    // Workspace packages resolve to SOURCE, not to dist. An app's tests must
    // not depend on a build step having run first, or a clean checkout fails
    // its own suite in a way that looks like a code error.
    "^@optima-compliance/engine$": "<rootDir>/packages/engine/src/index.ts",
    "^@optima-compliance/rules$": "<rootDir>/packages/rules/src/index.ts",
    "^@optima-compliance/db$": "<rootDir>/packages/db/src/index.ts",
    "^server-only$": "<rootDir>/test-support/server-only.cjs",
    // The web app's own `@/` alias, mirroring `apps/web/tsconfig.json`. Without
    // it a test cannot import a route or a page at all — anything reaching
    // `@/lib/server` fails to resolve — so route-level coverage was
    // structurally impossible rather than merely absent (NEH-1147).
    "^@/(.*)$": "<rootDir>/apps/web/src/$1",
    "^@optima-compliance/reminders$": "<rootDir>/packages/reminders/src/index.ts",
    "^@optima-compliance/export$": "<rootDir>/packages/export/src/index.ts",
    // @stonedogcode/style is a SUBMODULE shipping TypeScript source, so both entry
    // points map to source too. Its `preset` entry runs in Node at build time
    // and is what the theme-completeness test reads.
    "^@stonedogcode/style/preset$": "<rootDir>/packages/stonedog-style/src/preset/index.ts",
    "^@stonedogcode/style$": "<rootDir>/packages/stonedog-style/src/index.ts",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.test.json" }],
  },
};
