/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Panda's cross-package `include` globs must reach real files on disk.
 *
 * Panda finds styles by statically parsing source files, so a package it never
 * parses contributes no CSS. **A glob that matches nothing fails silently** —
 * no build error, no warning, no console message. Codegen succeeds, the class
 * names are still emitted into the DOM, and there is simply no CSS behind
 * them. The only symptom is pixels, and only for a component carrying an
 * inline `styled(…, { base: … })`: everything driven by the preset's recipes
 * keeps working, because Panda emits those from config without reading a
 * single source file. optima-cloud-saas ran for months with a broken glob and
 * nobody noticed, for exactly that reason.
 *
 * Two ways it breaks here, both real rather than theoretical:
 *
 * - **A package moves between the submodule and npm.** The glob must name
 *   wherever the package actually lives — `../../packages/stonedog-style/src`
 *   as a submodule, `node_modules/@stonedogcode/style/src` from the registry.
 *   Moving a consumer from one to the other means moving this line, and
 *   forgetting is silent. **That move has now happened** (NEH-1004):
 *   `@stonedogcode/style` is installed from the registry, and the submodule
 *   directory is gone. Had the glob been left behind, every assertion below
 *   would still have been *reachable* — the directory would simply be empty —
 *   which is why this file asserts file counts rather than path shapes.
 * - **npm hoisting decides which of two right-looking paths is the real one.**
 *   Panda runs with cwd `apps/web`; npm may put the package in
 *   `apps/web/node_modules` or in the repo-root one, depending on version
 *   conflicts elsewhere in the tree. Both are listed in the config, one of them
 *   matches nothing, and which one changes with an unrelated dependency bump.
 *   Deleting whichever is empty today is the tempting way to quiet a failure
 *   and the exact way to cause one later.
 * - **A scope rename rewrites a checkout directory.** `@stonedogcode/style` is
 *   the package NAME; `packages/stonedog-style` is a DIRECTORY, and a
 *   directory does not move when the package is renamed (NEH-482). A
 *   find-and-replace producing `packages/@stonedogcode/style/src/**` points at
 *   nothing — that exact mistake was caught three times across the sibling
 *   consumer repos during this rename, twice by a guard like this one.
 *
 * The globs are READ FROM `panda.config.ts` rather than restated here. A test
 * that restates them is a test of the filesystem and not of the config:
 * renaming the path in the config alone would leave it passing while Panda
 * parsed nothing. Written once, they cannot drift.
 */
import { readdirSync, existsSync } from "node:fs";
import { join, resolve, sep } from "node:path";

import pandaConfig from "../panda.config";

/**
 * Globs in `panda.config.ts` are relative to `apps/web`, which is where `panda
 * codegen` runs. Jest's `rootDir` is the repository root, so the base has to be
 * spelled out rather than taken from cwd. Tests compile to CommonJS (see
 * `tsconfig.test.json`), so `__dirname` exists.
 */
const APP_ROOT = resolve(__dirname, "..");

const includes = (pandaConfig as { include?: string[] }).include ?? [];

/** The globs reaching outside this app — the silent ones. */
const crossPackage = includes.filter((g) => g.startsWith("../") || g.includes("node_modules"));

/**
 * Which package a glob reaches for, so the assertion can be per PACKAGE.
 *
 * A package may legitimately be listed at more than one location — an
 * app-local and a hoisted `node_modules` path, because npm workspaces hoist
 * depending on version conflicts elsewhere in the tree. When that happens one
 * of the paths is *expected* to match nothing, and requiring every glob to
 * match would fail a config that is correct. The tempting way to quiet such a
 * failure is deleting whichever path is empty today — precisely the one that
 * starts matching the moment a dependency change moves the package.
 */
function packageOf(glob: string): string {
  return glob.match(/(?:node_modules|packages)\/(@[^/]+\/[^/]+|[^/]+)\//)?.[1] ?? glob;
}

const byPackage = crossPackage.reduce<Record<string, string[]>>((acc, glob) => {
  (acc[packageOf(glob)] ??= []).push(glob);
  return acc;
}, {});

/** The fixed directory prefix of a glob — everything before the first wildcard. */
function globBase(glob: string): string {
  const star = glob.indexOf("*");
  const upToStar = star === -1 ? glob : glob.slice(0, star);
  return upToStar.slice(0, upToStar.lastIndexOf("/") + 1);
}

/**
 * The extensions a glob accepts, from its `*.tsx` or `*.{ts,tsx}` tail.
 *
 * This is deliberately not a general glob implementation — no dependency here
 * provides one, and a hand-rolled one would be its own source of wrong
 * answers. It covers the two shapes this config actually uses, and the
 * question being asked is only "does this reach real source files", not "which
 * exact set".
 */
function globExtensions(glob: string): string[] {
  const braces = glob.match(/\*\.\{([^}]+)\}$/)?.[1];
  if (braces) return braces.split(",").map((e) => `.${e.trim()}`);
  const single = glob.match(/\*\.([A-Za-z]+)$/)?.[1];
  return single ? [`.${single}`] : [];
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/** Files under the glob's base directory carrying one of its extensions. */
function filesFor(glob: string): string[] {
  const base = resolve(APP_ROOT, globBase(glob));
  if (!existsSync(base)) return [];
  const exts = globExtensions(glob);
  return walk(base).filter((f) => exts.some((e) => f.endsWith(e)));
}

describe("Panda include globs resolve to real files (NEH-482)", () => {
  it("has cross-package globs to check", () => {
    // Guards the guard. If the config stopped including package source at all,
    // every case below would silently vanish and this file would report green
    // while checking nothing — the same failure mode it exists to catch.
    expect(crossPackage.length).toBeGreaterThan(0);
    expect(Object.keys(byPackage).length).toBeGreaterThan(0);
  });

  it.each(Object.entries(byPackage))("%s is reachable by at least one of its globs", (pkg, globs) => {
    const perGlob = globs.map((g) => ({ glob: g, files: filesFor(g).length }));
    const total = perGlob.reduce((n, p) => n + p.files, 0);
    if (total === 0) {
      // Name every candidate path: "expected > 0" alone does not say which
      // locations were searched, and that is the whole question.
      throw new Error(
        `No file matched any Panda include glob for "${pkg}":\n` +
          perGlob.map((p) => `  ${p.glob} -> ${p.files} files`).join("\n"),
      );
    }
    // Print the input-set size on SUCCESS too. `0 files over 0 globs` and
    // `83 files over 2 globs` are the same green, and only the count says the
    // set changed — a package that quietly stops shipping half its components
    // still passes `> 0`.
    console.log(
      `${pkg}: ${total} file(s) across ${globs.length} glob(s) [` +
        perGlob.map((p) => `${p.glob} -> ${p.files}`).join(", ") +
        "]",
    );
    expect(total).toBeGreaterThan(0);
  });

  it("reaches the style components themselves, not merely the directory", () => {
    // A glob can match stray files while missing the components that are the
    // entire reason it is here. Name real ones explicitly.
    //
    // The key is the PACKAGE name now, not the old `stonedog-style` checkout
    // directory (NEH-1004). Keying it on a name nothing produces would make
    // `styleGlobs` an empty array and every assertion below vacuous — so the
    // length check above it is not ceremony, it is what makes the rename
    // survivable.
    const styleGlobs = byPackage["@stonedogcode/style"] ?? [];
    expect(styleGlobs.length).toBeGreaterThan(0);
    const matched = styleGlobs.flatMap((g) => filesFor(g));
    const named = (file: string) => matched.some((f) => f.endsWith(`${sep}${file}`));
    // StyledBox is the oldest component and the one every layout leans on.
    expect(named("StyledBox.tsx")).toBe(true);
    // The form controls @optima-compliance/ui re-exports — the app's only
    // direct consumers of this package. If the glob reached the package but
    // not these, every input on every screen would lose its CSS.
    expect(named("StyledInputText.tsx")).toBe(true);
    expect(named("StyledInputSelect.tsx")).toBe(true);
    // The preset supplies recipes from config without reading source, so a
    // recipe-driven component keeps working through exactly the failure this
    // file exists to catch. Assert a component instead.
    expect(named("StyledButton.tsx")).toBe(true);
  });

  it("names the installed package, never the retired submodule directory", () => {
    // NEH-1004 removed `packages/stonedog-style`. A glob still naming it would
    // resolve to a directory that does not exist, which `filesFor` reports as
    // zero files — caught above, but only as "no file matched". Say the actual
    // cause here so the next reader is not left diagnosing a count.
    //
    // Scans EVERY include, not `crossPackage`. That filter keeps a glob only if
    // it starts with `../` or contains `node_modules` — so a bare
    // `"packages/stonedog-style/src/**/*.tsx"`, which is precisely the shape
    // this case exists to reject, was filtered out before the loop ever saw it
    // and the assertion passed over an empty set. Found by planting that exact
    // glob and watching this stay green.
    for (const glob of includes) {
      expect(glob).not.toContain("packages/stonedog-style");
    }
  });

  it("lists @stonedogcode/style at BOTH node_modules locations", () => {
    // npm hoisting decides which one is real, and it can change with an
    // unrelated dependency bump. One of these is expected to match nothing;
    // deleting the empty one is how a correct config becomes a silent
    // regression later. Assert both are present rather than trusting review.
    //
    // **Compared as exact strings, and that is not fussiness.** The first
    // version of this used `expect.stringContaining("./node_modules/…")`, and
    // it passed with the app-local path DELETED — because
    // `"../../node_modules/…"` contains `"./node_modules/…"` as a substring
    // (the `.` and `/` of the second `..`). A guard written to catch a silent
    // failure, itself passing over an empty set. Caught only by planting the
    // failure and watching it not fail.
    const styleGlobs = byPackage["@stonedogcode/style"] ?? [];
    expect([...styleGlobs].sort()).toEqual(
      [
        "../../node_modules/@stonedogcode/style/src/**/*.tsx",
        "./node_modules/@stonedogcode/style/src/**/*.tsx",
      ].sort(),
    );
  });

  it("names the checkout directory, never the scoped package name", () => {
    // `packages/@stonedogcode/style/src/**` is the rewrite that looks correct
    // after a scope rename and resolves to nothing.
    //
    // Every include, for the same reason as the case above: that rewrite need
    // not carry a `../` prefix, and `crossPackage` would then drop it.
    for (const glob of includes) {
      expect(glob).not.toContain("packages/@stonedogcode");
    }
  });
});
