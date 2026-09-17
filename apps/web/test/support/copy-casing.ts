/**
 * The copy-casing guard: the analyzer.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * **The gate is `apps/web/test/copy-casing.test.ts`**, in the jest run that
 * `npm run gate` (and so the hosted `gate` check) executes.
 *
 * Ported from the Optima Filings Cloud guard, which was itself ported from
 * HopperGuard's, so the fleet's guards agree about what "sentence case" means.
 * The rule function is identical; what differs is the registry and that this
 * repo has NO baseline: every Title Case copy literal fails.
 *
 * ## The rule
 *
 * Interface copy is **sentence case**: capitalise the first word and proper
 * nouns, nothing else. "Compliance calendar", "Add an entity", "Save changes".
 * The fleet-wide rule, and why, is the "Copy" section of the
 * `@stonedogcode/style` README. A proper noun is a word listed in
 * `apps/web/src/lib/copy/proper-nouns.ts`, not a word that feels important.
 *
 * ## What it looks at
 *
 * String literals rendered as interface copy, in `apps/web/src` and every
 * workspace package's `src`:
 *
 *   - JSX attributes that carry copy: `title`, `label`, `aria-label`,
 *     `placeholder`, `heading`, and so on;
 *   - object properties with the same names (`{ label: "Meeting minutes" }`),
 *     which is how option lists, document types and page `metadata` carry
 *     theirs, plus `subject` for email;
 *   - text inside a heading, button, link, label, legend or option, written
 *     directly or one or two `span`/`strong`/`em` wrappers deep, and inside
 *     anything rendered `as="h2"` and the like.
 *
 * It walks the TypeScript AST, so a comment is never a string literal and can
 * quote a bad example freely. Both arms of a ternary are read, and the literal
 * parts of a template are read with each `${…}` standing in as a lower-case
 * word.
 *
 * ## What it deliberately does not flag
 *
 *   - Words after sentence punctuation (`.` `!` `?` `:` `—`).
 *   - Everything after `e.g.`, which samples what a person might type.
 *   - Quoted words, which name another control or quote a document.
 *   - Acronyms (`EIN`, `LLC`) and mixed-case tokens (`StoneDogCode`).
 *   - Tokens containing a digit (`990-N`).
 *
 * ## What it cannot catch
 *
 *   - Indirection: copy built by a function, or arriving from the rule pack or
 *     the database, is invisible. It sees literals where they are rendered.
 *   - Body text in a bare `p` or `span`, and text behind a layout box.
 *   - The second capital of a hyphenated compound ("Sign-In").
 *   - Semantics: whether a word is a name is decided in the registry.
 *
 * The honest claim is "no Title Case copy literal is in this app's source",
 * not "every string on screen is sentence case".
 */

import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";
import ts from "typescript";

import { PROPER_NOUNS } from "../../src/lib/copy/proper-nouns";

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const SKIP_DIRECTORIES = new Set([
  "node_modules",
  ".next",
  "styled-system",
  "coverage",
  "dist",
  "test",
  "__tests__",
  "__mocks__",
  "fixtures",
]);
const SKIP_FILE = /\.(test|spec)\.[cm]?[jt]sx?$|\.d\.ts$/;

/**
 * Files that are not authored copy, each with its reason. The test asserts
 * every one still exists, so an entry cannot outlive the file it excuses.
 */
export const EXCLUDED_FILES: ReadonlyMap<string, string> = new Map([
  [
    "packages/rules/src/generated.ts",
    "Generated from packages/rules/us/**/*.json by rules:barrel. Each rule's title is the " +
      "agency's own name for the filing (\"Nonprofit Corporation Annual Report\", \"Form 990 — " +
      "Return of Organization Exempt From Income Tax\"), a document title quoted as published, " +
      "not interface copy written here.",
  ],
]);

/** JSX attributes whose string value is rendered as interface copy. */
export const COPY_ATTRIBUTES: ReadonlySet<string> = new Set([
  "title",
  "label",
  "tooltip",
  "aria-label",
  "heading",
  "subtitle",
  "placeholder",
  "buttonText",
  "confirmText",
  "cancelText",
  "submitText",
  "confirmLabel",
  "cancelLabel",
  "submitLabel",
  "emptyState",
]);

/**
 * Object-literal keys whose string value is rendered as interface copy.
 *
 * `title` covers Next's page `metadata`, which is the browser tab and the
 * search result — copy a stranger reads first. `subject` is an email's.
 */
export const COPY_PROPERTIES: ReadonlySet<string> = new Set([
  "title",
  "label",
  "tooltip",
  "heading",
  "subtitle",
  "placeholder",
  "buttonText",
  "confirmText",
  "cancelText",
  "submitText",
  "subject",
]);

/** Elements whose DIRECT text children are interface copy. */
export const COPY_TEXT_TAGS: ReadonlySet<string> = new Set([
  "StyledFormLabel",
  "StyledDeleteButton",
  "Link",
  "button",
  "a",
  "label",
  "legend",
  "summary",
  "option",
  "th",
  "caption",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
]);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The words in `text` that break sentence case.
 *
 * Exported so the rule itself is unit-tested in both directions, not only the
 * file walk around it.
 */
export function titleCaseWords(text: string, nouns: readonly string[] = PROPER_NOUNS): string[] {
  let t = text.replace(/\s+/g, " ").trim();

  // Examples quote what a person might type, and user text is never recased.
  t = t.replace(/\b(e\.g\.|i\.e\.)[\s\S]*$/i, "");
  // Quoted words name another control or quote a document. Single quotes only
  // when they open at a word boundary, so an apostrophe in "Don't" cannot pair
  // with a later one and swallow the words between. A sentence that ends
  // INSIDE the quote (`Click "Save." Next`) keeps its full stop, or the word
  // after it would be read as mid-sentence.
  const quoted = (m: string) => (/[.!?:…]["”'’]$/.test(m) ? " q. " : " q ");
  t = t
    .replace(/"[^"]*"/g, quoted)
    .replace(/“[^”]*”/g, quoted)
    .replace(/‘[^’]*’/g, quoted)
    .replace(/(^|[\s(])'[^']+'(?=$|[\s).,:;!?])/g, (m, lead: string) => `${lead}${quoted(m)}`);

  for (const noun of nouns) {
    t = t.replace(new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(noun)}(?![A-Za-z0-9])`, "g"), "n");
  }

  const tokens = t.split(" ").filter(Boolean);
  // The first WORD is allowed its capital; a leading emoji or `+` is not a word.
  const first = tokens.findIndex((token) => /[A-Za-z]/.test(token));
  const offenders: string[] = [];
  for (let k = first + 1; first >= 0 && k < tokens.length; k++) {
    const previous = tokens[k - 1] ?? "";
    // A new sentence or phrase starts after these.
    if (/[.!?:…—–]$/.test(previous) || previous === "-" || previous === "•") continue;
    const word = (tokens[k] ?? "").replace(/^[([{+]+/, "");
    if (/\d/.test(word)) continue;
    if (/^[A-Z]{2,}/.test(word)) continue; // EIN, LLC, PDFs
    if (/^[A-Z][a-z]+[A-Z]/.test(word)) continue; // WebAuthn, StoneDogCode
    if (/^[A-Z][a-z]/.test(word)) offenders.push(word.replace(/[^A-Za-z'’-]+$/, ""));
    // The article, capitalised mid-phrase ("Add A New Entity"). Only "A": "I"
    // is always a capital, and a lone "B" is usually a label ("Plan B").
    else if (/^A[^A-Za-z]*$/.test(word)) offenders.push("A");
  }
  return offenders;
}

export interface Violation {
  /** Path relative to the scan base, with forward slashes. */
  file: string;
  line: number;
  kind: "attribute" | "property" | "text";
  text: string;
  words: string[];
}

export interface AnalysisResult {
  /** Every file walked, relative to the scan base — so a caller can prove a plant was in the set. */
  files: string[];
  filesScanned: number;
  /** Copy strings of two or more words — the only ones that can break the rule. */
  stringsExamined: number;
  /** The examined strings themselves, so the registry can be checked for dead entries. */
  examinedTexts: string[];
  violations: Violation[];
  /** Files that failed to parse. Non-empty means the scan is not trustworthy. */
  unparsed: string[];
}

export interface AnalyzeOptions {
  baseDir: string;
  /** Directories under `baseDir` to walk. */
  roots: readonly string[];
  nouns?: readonly string[];
}

/**
 * The directories the real tree is scanned under: the web app, and the `src`
 * of every workspace package. Derived, not listed, so a package added later is
 * scanned by the act of creating it.
 */
export function defaultScanRoots(repoRoot: string): string[] {
  const packagesDir = join(repoRoot, "packages");
  const packages = existsSync(packagesDir)
    ? readdirSync(packagesDir)
        .filter((name) => existsSync(join(packagesDir, name, "package.json")))
        .filter((name) => existsSync(join(packagesDir, name, "src")))
        .sort()
        .map((name) => `packages/${name}/src`)
    : [];
  return ["apps/web/src", ...packages];
}

function sourceFiles(dir: string, found: string[] = []): string[] {
  if (!existsSync(dir)) return found;
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRECTORIES.has(entry)) continue;
    const full = join(dir, entry);
    const stat = lstatSync(full);
    // A linked package or `node_modules` is a symlink; following one walks out
    // of the tree being measured.
    if (stat.isSymbolicLink()) continue;
    if (stat.isDirectory()) sourceFiles(full, found);
    else if (SOURCE_EXTENSIONS.has(extname(entry)) && !SKIP_FILE.test(entry)) found.push(full);
  }
  return found;
}

/** Every string a copy-bearing expression can produce, as far as literals show. */
function literalTexts(expression: ts.Expression): string[] {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return [expression.text];
  }
  if (ts.isParenthesizedExpression(expression)) return literalTexts(expression.expression);
  if (ts.isConditionalExpression(expression)) {
    return [...literalTexts(expression.whenTrue), ...literalTexts(expression.whenFalse)];
  }
  if (ts.isTemplateExpression(expression)) {
    // Each `${…}` stands in as a lower-case word: "Show more of ${name}".
    return [
      [
        expression.head.text,
        ...expression.templateSpans.map((span) => `x ${span.literal.text}`),
      ].join(" "),
    ];
  }
  return [];
}

function propertyName(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  return null;
}

function tagRoot(node: ts.JsxOpeningElement): string {
  return node.tagName.getText().split(".")[0] ?? "";
}

/**
 * What `as="…"` renders a polymorphic component as, when it is a literal.
 * `<StyledText as="legend">` is a legend whatever its component is called.
 */
function renderedAs(node: ts.JsxOpeningElement): string | null {
  for (const attribute of node.attributes.properties) {
    if (
      ts.isJsxAttribute(attribute) &&
      attribute.name.getText() === "as" &&
      attribute.initializer &&
      ts.isStringLiteral(attribute.initializer)
    ) {
      return attribute.initializer.text;
    }
  }
  return null;
}

/** Elements rendered AS one of these are copy, whatever component draws them. */
const COPY_RENDERED_AS: ReadonlySet<string> = new Set([
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "legend",
  "label",
  "caption",
  "th",
  "summary",
  "button",
]);

/**
 * Wrappers that only style the text they hold, so text one or two of them deep
 * inside a copy element is still that element's copy.
 */
const TRANSPARENT_WRAPPERS: ReadonlySet<string> = new Set(["span", "strong", "em"]);

function isCopyElement(node: ts.JsxOpeningElement): boolean {
  const as = renderedAs(node);
  return COPY_TEXT_TAGS.has(tagRoot(node)) || (as !== null && COPY_RENDERED_AS.has(as));
}

/** True when text sitting directly in `element` is interface copy. */
function holdsCopy(element: ts.JsxElement): boolean {
  let current: ts.Node = element;
  for (let depth = 0; depth < 3 && ts.isJsxElement(current); depth++) {
    if (isCopyElement(current.openingElement)) return true;
    // Only climb through a wrapper that styles text; a layout box between
    // the text and a heading means the text is not the heading's.
    if (!TRANSPARENT_WRAPPERS.has(tagRoot(current.openingElement))) return false;
    current = current.parent;
  }
  return false;
}

export function analyze({ baseDir, roots, nouns = PROPER_NOUNS }: AnalyzeOptions): AnalysisResult {
  const fullPaths = roots
    .flatMap((root) => sourceFiles(join(baseDir, root)))
    .filter((full) => !EXCLUDED_FILES.has(relative(baseDir, full).split(sep).join("/")))
    .sort();
  // Forward slashes on every platform, so reported paths match wherever it runs.
  const files = fullPaths.map((full) => relative(baseDir, full).split(sep).join("/"));
  const violations: Violation[] = [];
  const unparsed: string[] = [];
  const examinedTexts: string[] = [];

  fullPaths.forEach((full, index) => {
    const file = files[index] ?? full;
    const text = readFileSync(full, "utf8");
    const kind = full.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const source = ts.createSourceFile(full, text, ts.ScriptTarget.Latest, true, kind);
    if ((source as unknown as { parseDiagnostics?: unknown[] }).parseDiagnostics?.length) {
      unparsed.push(file);
      return;
    }

    const check = (node: ts.Node, copy: string, where: Violation["kind"]) => {
      const normalised = copy.replace(/\s+/g, " ").trim();
      if (!/[A-Za-z]/.test(normalised) || !normalised.includes(" ")) return;
      examinedTexts.push(normalised);
      const words = titleCaseWords(normalised, nouns);
      if (words.length === 0) return;
      violations.push({
        file,
        line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
        kind: where,
        text: normalised,
        words,
      });
    };

    const visit = (node: ts.Node): void => {
      if (ts.isJsxAttribute(node) && node.initializer) {
        const name = node.name.getText(source);
        if (COPY_ATTRIBUTES.has(name)) {
          const init = node.initializer;
          const texts = ts.isStringLiteral(init)
            ? [init.text]
            : ts.isJsxExpression(init) && init.expression
              ? literalTexts(init.expression)
              : [];
          for (const copy of texts) check(node, copy, "attribute");
        }
      } else if (ts.isPropertyAssignment(node)) {
        const name = propertyName(node.name);
        if (name && COPY_PROPERTIES.has(name)) {
          for (const copy of literalTexts(node.initializer)) check(node, copy, "property");
        }
      } else if (ts.isJsxText(node) && !node.containsOnlyTriviaWhiteSpaces) {
        const parent = node.parent;
        if (ts.isJsxElement(parent) && holdsCopy(parent)) check(node, node.text, "text");
      } else if (ts.isJsxExpression(node) && node.expression && ts.isJsxElement(node.parent)) {
        // `<button>{"Save changes"}</button>` — the same copy, written as an
        // expression. An attribute's `{…}` has a JsxAttribute parent and is
        // handled above.
        if (holdsCopy(node.parent)) {
          for (const copy of literalTexts(node.expression)) check(node, copy, "text");
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  });

  return {
    files,
    filesScanned: files.length,
    stringsExamined: examinedTexts.length,
    examinedTexts,
    violations,
    unparsed,
  };
}

export function passes(result: AnalysisResult): boolean {
  return result.unparsed.length === 0 && result.violations.length === 0;
}

export function formatReport(result: AnalysisResult): string {
  const files = new Set(result.violations.map((v) => v.file)).size;
  const lines: string[] = [
    `copy-casing guard: examined ${result.filesScanned} source file(s) and ` +
      `${result.stringsExamined} copy string(s); ${result.violations.length} Title Case ` +
      `string(s) in ${files} file(s)`,
  ];
  if (result.unparsed.length > 0) {
    lines.push(`  ${result.unparsed.length} file(s) FAILED TO PARSE, so this scan is not trustworthy:`);
    for (const f of result.unparsed) lines.push(`    ${f}`);
  }
  if (result.violations.length > 0) {
    lines.push(
      "  Write sentence case, or list a real name in apps/web/src/lib/copy/proper-nouns.ts:",
    );
    for (const v of result.violations) {
      lines.push(`    ${v.file}:${v.line}  "${v.text}"  [${v.words.join(", ")}]`);
    }
  }
  if (passes(result)) lines.push("  no Title Case copy");
  return lines.join("\n");
}
