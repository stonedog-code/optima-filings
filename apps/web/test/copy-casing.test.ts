/**
 * The copy-casing guard, and the proof it is not vacuous.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Interface copy is sentence case, fleet-wide (the "Copy" section of the
 * `@stonedogcode/style` README), and a capital mid-phrase is allowed only for
 * a name listed in `apps/web/src/lib/copy/proper-nouns.ts`. What the analyzer
 * reads, and what it cannot see, is in `support/copy-casing.ts`.
 *
 * This suite is the gate: `npm run gate` runs jest. Every "it passes" here is
 * paired with a "and here is what makes it fail": a planted tree, a plant
 * taken from the real home page, and the rule function directly. A guard that
 * has only ever been observed passing has been run, not tested.
 *
 * Comments are exempt by construction (the scan walks the TypeScript AST, and
 * a comment is never a string literal), which is why this file can quote
 * Title Case freely.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import {
  BRAND_NAMES,
  GOVERNMENT_NAMES,
  PROPER_NOUNS,
  THIRD_PARTY_NAMES,
} from "../src/lib/copy/proper-nouns";
import {
  analyze,
  defaultScanRoots,
  EXCLUDED_FILES,
  formatReport,
  passes,
  titleCaseWords,
} from "./support/copy-casing";

const REPO = resolve(__dirname, "..", "..", "..");
const result = analyze({ baseDir: REPO, roots: defaultScanRoots(REPO) });

/** Write a throwaway tree and scan it, so a plant cannot leak into the repo. */
function scanTree(files: Record<string, string>) {
  const tmp = mkdtempSync(join(tmpdir(), "copy-casing-"));
  try {
    for (const [path, body] of Object.entries(files)) {
      mkdirSync(dirname(join(tmp, path)), { recursive: true });
      writeFileSync(join(tmp, path), body);
    }
    return analyze({ baseDir: tmp, roots: ["src"] });
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

const PLANTED = `
import Link from "next/link";
export function Planted() {
  return (
    <form>
      <h1>Upcoming Deadlines</h1>
      <label>
        <span>Legal Business Name</span>
      </label>
      <input placeholder="Enter Your EIN" />
      <button>{"Save Changes"}</button>
      <Link href="/terms">Terms of Use</Link>
    </form>
  );
}
`;

const CONVERTED = `
import Link from "next/link";
export const metadata = { title: "Compliance calendar — Optima Filings" };
export function Converted() {
  return (
    <form>
      <h1>Upcoming deadlines</h1>
      <label>
        <span>Legal business name</span>
      </label>
      <input placeholder="Enter your EIN" />
      <input placeholder="e.g. Acme Holdings LLC" />
      <button>{"Save changes"}</button>
      <Link href="/terms">Terms of use</Link>
      <h2>File with the IRS by Friday</h2>
      <h2>Step 2: Choose a date</h2>
    </form>
  );
}
`;

const COMMENTS_ONLY = `
// Upcoming Deadlines
/* Legal Business Name */
export function Commented() {
  return <div>{/* Save Changes */}</div>;
}
`;

describe("copy-casing guard: the real tree", () => {
  it("examines a non-empty set, and says how big", () => {
    // Printed as well as asserted: "0 over 0 strings" and "0 over 90" are the
    // same verdict and different facts. Floors, not pins.
    console.log(`[copy-casing] ${formatReport(result).split("\n")[0]}`);
    expect(result.filesScanned).toBeGreaterThan(50);
    expect(result.stringsExamined).toBeGreaterThan(60);
  });

  it("walks the web app and every workspace package that has source", () => {
    const roots = defaultScanRoots(REPO);
    expect(roots).toContain("apps/web/src");
    expect(roots).toContain("packages/engine/src");
    expect(result.files.some((f) => f.startsWith("apps/web/src/"))).toBe(true);
    expect(result.files.some((f) => f.startsWith("packages/engine/src/"))).toBe(true);
  });

  it("parses every file it examined", () => {
    expect(result.unparsed).toEqual([]);
  });

  it("finds no Title Case copy, with no baseline", () => {
    if (!passes(result)) throw new Error(formatReport(result));
    expect(result.violations).toEqual([]);
  });

  it("excludes only files that exist, each with a reason, and nothing else", () => {
    for (const [file, reason] of EXCLUDED_FILES) {
      expect({ file, exists: existsSync(join(REPO, file)) }).toEqual({ file, exists: true });
      expect(reason.length).toBeGreaterThan(40);
      expect(result.files).not.toContain(file);
    }
  });
});

describe("copy-casing guard: the registry", () => {
  it("carries the brand spelled as the owner decided", () => {
    expect(BRAND_NAMES).toContain("Optima Filings");
    expect(BRAND_NAMES).not.toContain("Optima filings");
  });

  it("lists only names this product's code actually uses", () => {
    const code = result.files.map((file) => readFileSync(join(REPO, file), "utf8")).join("\n");
    const listed = [...BRAND_NAMES, ...GOVERNMENT_NAMES, ...THIRD_PARTY_NAMES];
    expect(listed.filter((noun) => !code.includes(noun))).toEqual([]);
    // And the same check CAN fail.
    expect([...listed, "Nonexistent Vendor"].filter((noun) => !code.includes(noun))).toEqual([
      "Nonexistent Vendor",
    ]);
  });

  it("is sorted longest first", () => {
    for (let i = 1; i < PROPER_NOUNS.length; i++) {
      expect((PROPER_NOUNS[i - 1] ?? "").length).toBeGreaterThanOrEqual(
        (PROPER_NOUNS[i] ?? "").length,
      );
    }
  });
});

describe("copy-casing guard: the rule, in both directions", () => {
  it.each([
    ["Upcoming Deadlines", ["Deadlines"]],
    ["File an Annual Report", ["Annual", "Report"]],
    ["Terms of Use", ["Use"]],
    ["Add A New Entity", ["A", "New", "Entity"]],
  ])("flags %j", (text, words) => {
    expect(titleCaseWords(text)).toEqual(words);
  });

  it.each([
    "Upcoming deadlines",
    "Optima Filings is free software",
    "Ask the Secretary of State for a certificate",
    "Enter the EIN from your IRS letter",
    "Step 2: Choose a date",
    "e.g. Acme Holdings LLC",
    "Press 'Save Changes' to finish",
    "Due on Friday",
  ])("allows %j", (text) => {
    expect(titleCaseWords(text)).toEqual([]);
  });
});

describe("copy-casing guard: a plant proves it can fail", () => {
  it("FAILS on a planted heading, wrapped label, placeholder, expression child and link", () => {
    console.log(`[copy-casing] the plant:\n${PLANTED}`);
    const planted = scanTree({ "src/app/Planted.tsx": PLANTED });
    expect(planted.files).toEqual(["src/app/Planted.tsx"]);
    expect(planted.violations.map((v) => v.text).sort()).toEqual([
      "Enter Your EIN",
      "Legal Business Name",
      "Save Changes",
      "Terms of Use",
      "Upcoming Deadlines",
    ]);
    expect(passes(planted)).toBe(false);
    expect(formatReport(planted)).toContain("Planted.tsx");
  });

  it("FAILS on a plant taken from the real home page, and passes on the page untouched", () => {
    const home = readFileSync(join(REPO, "apps", "web", "src", "app", "page.tsx"), "utf8");
    const heading = /<h2[^>]*>\s*([a-zA-Z][^<{}]+?)\s*<\/h2>/.exec(home)?.[1];
    expect(heading).toBeDefined();
    const original = heading ?? "";
    const plant = original.replace(/\b([a-z])/g, (letter) => letter.toUpperCase());
    expect(plant).not.toBe(original);

    const control = scanTree({ "src/app/page.tsx": home });
    expect(control.files).toEqual(["src/app/page.tsx"]);
    expect(control.violations).toEqual([]);

    const plantedHome = home.replace(original, plant);
    console.log(`[copy-casing] planted into a copy of page.tsx: "${original}" -> "${plant}"`);
    expect(plantedHome).toContain(plant);
    const planted = scanTree({ "src/app/page.tsx": plantedHome });
    expect(planted.violations.map((v) => v.text)).toEqual([plant]);
  });

  it("PASSES on the same screen in sentence case, with the exemptions exercised", () => {
    const converted = scanTree({ "src/app/Converted.tsx": CONVERTED });
    expect(converted.stringsExamined).toBeGreaterThan(8);
    expect(converted.violations).toEqual([]);
  });

  it("never reads a comment as copy", () => {
    const commented = scanTree({ "src/app/Commented.tsx": COMMENTS_ONLY });
    expect(commented.filesScanned).toBe(1);
    expect(commented.stringsExamined).toBe(0);
  });

  it("says so when there is nothing to examine", () => {
    const empty = scanTree({});
    expect(empty.filesScanned).toBe(0);
    expect(formatReport(empty)).toContain("examined 0 source file(s)");
  });
});
