/**
 * Validates every rule pack.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * The JSON Schema catches shape. This catches the things a schema cannot see
 * across files — a duplicated id, two versions of one rule claiming the same
 * dates, a citation that is really a placeholder — and each check is here
 * because getting it wrong produces a silently wrong calendar rather than an
 * error.
 */

import { readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";

import { loadRules } from "./build-barrel.mjs";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const schemaPath = join(packageRoot, "schema", "rule.v1.json");

/**
 * Facts a condition may test. Mirrors `CONDITIONABLE_FACTS` in the engine.
 *
 * Duplicated deliberately: this script runs before anything is built, so it
 * cannot import from the engine's `dist`. The parity test in the engine suite
 * fails if the two ever drift.
 */
const CONDITIONABLE_FACTS = [
  "grossRevenueMinorUnits",
  "totalAssetsMinorUnits",
  "charitableAssetsMinorUnits",
  "employeeCount",
  "solicitsCharitableContributions",
  "isPrivateFoundation",
  "isSupportingOrganization",
  "normalAnnualGrossReceiptsMinorUnits",
];

const errors = [];
const warnings = [];

const schema = JSON.parse(await readFile(schemaPath, "utf8"));
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateSchema = ajv.compile(schema);

const rules = await loadRules();
const byId = new Map();

for (const { rule, file } of rules) {
  const where = relative(packageRoot, file);

  if (!validateSchema(rule)) {
    for (const error of validateSchema.errors ?? []) {
      errors.push(`${where}: ${error.instancePath || "/"} ${error.message}`);
    }
    // Later checks assume a well-formed rule; reporting them too would bury
    // the schema error under noise it caused.
    continue;
  }

  // The filename is not the id, but a mismatch is almost always a copy-paste
  // that left the neighbour's id behind — the single most common authoring slip.
  const expectedSlug = where.split("/").pop().replace(/\.json$/, "");
  if (!rule.id.endsWith(expectedSlug)) {
    warnings.push(
      `${where}: id "${rule.id}" does not end with the filename slug "${expectedSlug}" — copy-paste leftover?`,
    );
  }

  const jurisdictionPrefix = rule.jurisdiction
    .toLowerCase()
    .replace("-", "-")
    .replace("/", "-");
  const expectedPrefix =
    rule.jurisdiction === "US" ? "us-federal" : `${jurisdictionPrefix}`;
  if (!rule.id.startsWith(expectedPrefix.split("-").slice(0, 2).join("-"))) {
    warnings.push(
      `${where}: id "${rule.id}" is not prefixed for jurisdiction ${rule.jurisdiction}`,
    );
  }

  // Flattened, so a fact inside an `anyOf` group is checked too. A group whose
  // member tested an undefined fact would otherwise validate and then never
  // match — a silent false negative, the failure mode this product can least
  // afford.
  for (const node of rule.conditions ?? []) {
    for (const condition of node.anyOf ?? [node]) {
      if (!CONDITIONABLE_FACTS.includes(condition.fact)) {
        errors.push(
          `${where}: condition tests "${condition.fact}", which the entity fact model does not define`,
        );
      }
    }
    // A one-member group is an AND entry in disguise, and reads as though an
    // alternative was dropped by mistake. Say so rather than quietly accepting it.
    if (node.anyOf && node.anyOf.length < 2) {
      errors.push(
        `${where}: an "anyOf" group needs at least two alternatives (got ${node.anyOf.length})`,
      );
    }
  }

  if (rule.effectiveTo && rule.effectiveTo < rule.effectiveFrom) {
    errors.push(`${where}: effectiveTo is before effectiveFrom`);
  }

  if (rule.lastVerified < rule.effectiveFrom) {
    warnings.push(
      `${where}: lastVerified (${rule.lastVerified}) predates effectiveFrom (${rule.effectiveFrom})`,
    );
  }

  // A citation that is a bare URL or a placeholder is not reviewable — a
  // reviewer needs to know WHICH statute to read, not just where the agency is.
  if (/^https?:\/\//.test(rule.citation)) {
    errors.push(
      `${where}: citation is a bare URL. Name the statute or form; put the link in citationUrl.`,
    );
  }
  if (/\b(tbd|todo|xxx|fixme)\b/i.test(rule.citation)) {
    errors.push(`${where}: citation is a placeholder (${rule.citation})`);
  }

  const existing = byId.get(rule.id) ?? [];
  existing.push({ rule, where });
  byId.set(rule.id, existing);
}

// A rule id may legitimately appear more than once — that is how a fee change
// is recorded, as an old version with effectiveTo plus a new one. What is never
// legitimate is two versions in force at the same time: the engine would emit
// both and the entity would appear to owe the filing twice.
for (const [id, versions] of byId) {
  if (versions.length === 1) continue;

  const sorted = [...versions].sort((a, b) =>
    a.rule.effectiveFrom.localeCompare(b.rule.effectiveFrom),
  );
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const earlier = sorted[i];
    const later = sorted[i + 1];
    if (!earlier.rule.effectiveTo) {
      errors.push(
        `${id}: ${earlier.where} has no effectiveTo but ${later.where} supersedes it — set effectiveTo, or the engine emits both.`,
      );
    } else if (earlier.rule.effectiveTo >= later.rule.effectiveFrom) {
      errors.push(
        `${id}: effective windows overlap between ${earlier.where} and ${later.where}`,
      );
    }
  }
}

for (const warning of warnings) console.warn(`warn  ${warning}`);
for (const error of errors) console.error(`ERROR ${error}`);

const drafts = rules.filter(({ rule }) => rule.status === "draft").length;
console.log(
  `\n${rules.length} rules checked, ${byId.size} distinct ids, ${errors.length} errors, ${warnings.length} warnings.`,
);
if (drafts > 0) {
  console.log(
    `${drafts} are status "draft" — written but NOT yet checked against the primary source by a human.`,
  );
}

process.exit(errors.length > 0 ? 1 : 0);
