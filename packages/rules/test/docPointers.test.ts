/**
 * Every document this repo points a reader at must be one they can open.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * ## Why this exists
 *
 * Three pointers in tracked files named documents nobody outside this machine
 * could read, and each was written in good faith:
 *
 * - `rule.v1.json`'s own description sent rule authors to a `rule-authoring`
 *   guide under `docs/`. **That file has never existed** - the guide is in
 *   `CONTRIBUTING.md`. It is the first line a non-developer rule author reads,
 *   and it sent them nowhere.
 * - `facts.ts` and a rule-verification record both cited a private-foundation
 *   PRD under `docs/prd/`. That directory is a **gitignored symlink** into an
 *   internal repo (`.gitignore`: "PRDs live in the INTERNAL stonedog-prd repo,
 *   never here - this repo is PUBLIC"). It resolves on one workstation and
 *   nowhere else.
 *
 * Note those two are described rather than written out. **This guard scans its
 * own source**, as it must - exempting the guard's file would be the same
 * self-exemption this repo bans elsewhere - so a literal path in a comment here
 * is a reference like any other, and naming a broken one as an example would
 * make the file fail itself. Write such an example without its extension.
 *
 * The second shape is the worse one. This repository is public and its pitch is
 * that every claim cites something you can check; a citation only the author can
 * open is the opposite of that, and it fails silently - the reference reads as
 * evidence to everyone who does not try the link.
 *
 * ## Scope, stated because a guard that overreaches gets deleted
 *
 * It checks references to markdown files under `docs/` only - paths inside this
 * repo, with an extension, so a bare mention of a directory (`.gitignore`'s
 * `docs/prd`) is not a reference to a document. External URLs are a different
 * problem with a different fix, and are not in scope.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(__dirname, "..", "..", "..");

/**
 * Tracked text files only.
 *
 * `git ls-files` is the one definition of "what ships" that the repository
 * maintains for you, and it already excludes `node_modules`, build output and
 * anything gitignored - which is the point here, since the defect being guarded
 * is a pointer INTO gitignored territory.
 */
function trackedTextFiles(): string[] {
  const out = execFileSync("git", ["ls-files"], { cwd: repoRoot, encoding: "utf8" });
  return out
    .split("\n")
    .filter(Boolean)
    .filter((file) => /\.(ts|tsx|mjs|js|json|md)$/.test(file));
}

/** Every markdown reference under `docs/`, with the file and line it sits on. */
function docReferences(): { file: string; line: number; target: string }[] {
  const found: { file: string; line: number; target: string }[] = [];
  for (const file of trackedTextFiles()) {
    const text = readFileSync(join(repoRoot, file), "utf8");
    text.split("\n").forEach((lineText, index) => {
      for (const match of lineText.matchAll(/docs\/[A-Za-z0-9._/-]+\.md/g)) {
        found.push({ file, line: index + 1, target: match[0]! });
      }
    });
  }
  return found;
}

describe("every docs/ pointer names a file a reader can open", () => {
  const references = docReferences();
  const files = trackedTextFiles();

  it("examines a plausible input set", () => {
    // The count, asserted rather than assumed. A scan that silently stopped
    // finding files would report "0 broken pointers" - indistinguishable from a
    // healthy tree, and the failure this fleet meets most often.
    expect(files.length).toBeGreaterThan(100);
    expect(references.length).toBeGreaterThan(0);
  });

  it.each(
    // Deduplicated by target so one popular document does not dominate the
    // output, while every distinct broken target still fails on its own line.
    [...new Map(references.map((ref) => [ref.target, ref])).values()].map(
      (ref) => [ref.target, ref] as const,
    ),
  )("%s exists", (target, ref) => {
    expect({
      target,
      citedAt: `${ref.file}:${ref.line}`,
      exists: existsSync(join(repoRoot, target)),
    }).toEqual({ target, citedAt: `${ref.file}:${ref.line}`, exists: true });
  });
});
