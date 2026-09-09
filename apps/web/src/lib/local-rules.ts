import "server-only";
/**
 * Rule files an operator adds to their OWN install — NEH-1255.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * ## The gap this closes
 *
 * `@optima-compliance/rules` is inlined into a TypeScript barrel at build time,
 * because the engine has to run in a browser and cannot `fs.readFile` a pack.
 * That is right for the shipped set and it left a running install with **no way
 * to add a rule at all**: a self-hoster whose county wants an annual filing, or
 * a contributor drafting one, had to rebuild the image to see it. The product
 * asks people to contribute rules and then gave them nowhere to put one.
 *
 * `OPTIMA_RULES_DIR` names a directory of rule JSON. Every `.json` under it, at
 * any depth, is loaded at request time and merged with the shipped pack.
 *
 * ## Why the name
 *
 * `OPTIMA_RULES_DIR`, matching `OPTIMA_DOCUMENTS_DIR` — the other variable that
 * names a directory of files the operator owns. It is read straight from the
 * environment rather than through `renamedEnv`, because that helper exists to
 * carry a PRE-RENAME `MAXIMUS_*` name forward and this variable has never had
 * one. Routing a brand-new setting through it would invent a legacy spelling
 * and quietly promise to honour it.
 *
 * ## Every failure here is LOUD, and that is the whole design
 *
 * A rule file that is skipped because it is malformed is the worst outcome this
 * repo has a name for: the calendar renders, looks complete, and is missing a
 * filing. So a directory that cannot be read, a file that is not JSON, a rule
 * the schema rejects, and an id that collides all THROW. The dashboard shows an
 * error and the server log names the file — an operator who added a rule finds
 * out on the next page load, which is the moment they are looking.
 *
 * The rules are validated against `packages/rules/schema/rule.v1.json`, the
 * same schema `npm run rules:validate` compiles, so a file that passes the
 * contributor's gate passes here and vice versa.
 *
 * ## Read fresh on every call, deliberately
 *
 * The compiled validator is cached for the life of the process; the DIRECTORY
 * is not. Someone authoring a rule edits the file and reloads the page. Caching
 * the load would mean a restart per edit, on the one surface whose reason for
 * existing is that rebuilding was too slow a loop. A handful of small JSON
 * files per request is not a cost this tier can measure.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import type { Rule } from "@optima-compliance/engine";
import { ALL_RULES } from "@optima-compliance/rules";
import schema from "@optima-compliance/rules/schema/rule.v1.json";

/** The variable an operator sets. Exported so the docs and tests name one thing. */
export const RULES_DIR_ENV = "OPTIMA_RULES_DIR";

/*
 * `strict: false` and `addFormats` both mirror `packages/rules/scripts/validate.mjs`.
 * A second Ajv configured differently would accept files the contributor gate
 * rejects, or reject files it accepts — and either way the operator is told
 * something the project's own tooling disagrees with.
 */
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateRule = ajv.compile(schema as object);

/** Every `.json` under `dir`, depth-first, in a stable order. */
function ruleFilesIn(dir: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of [...entries].sort((a, b) => a.name.localeCompare(b.name))) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...ruleFilesIn(full));
    else if (entry.name.endsWith(".json")) files.push(full);
  }
  return files;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Load and validate every rule in `dir`.
 *
 * `shipped` is a parameter so a test can supply its own collision set, and so
 * the duplicate-id check is a property of the merge rather than of a module
 * import nothing can vary.
 *
 * Throws — see the header. Nothing here returns a partial set.
 */
export function loadRulesFrom(
  dir: string,
  shipped: readonly Rule[] = ALL_RULES,
): Rule[] {
  let files: string[];
  try {
    files = ruleFilesIn(dir);
  } catch (cause) {
    throw new Error(
      `${RULES_DIR_ENV} is ${JSON.stringify(dir)}, which could not be read: ` +
        `${(cause as Error).message}. Create the directory, or unset ${RULES_DIR_ENV}.`,
      { cause },
    );
  }

  // Seeded with the shipped pack, so a local file cannot shadow a published id.
  // A rule id is a permanent public identifier and the engine emits every rule
  // that matches — two rules sharing one id put the same filing on the calendar
  // twice, which is `rules:validate`'s "the engine emits both" in a place no
  // gate can see.
  const seen = new Map<string, string>();
  for (const rule of shipped) seen.set(rule.id, "the shipped rule pack");

  const loaded: Rule[] = [];
  for (const file of files) {
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(file, "utf8"));
    } catch (cause) {
      throw new Error(`${file} is not valid JSON: ${(cause as Error).message}`, {
        cause,
      });
    }
    if (!isPlainObject(raw)) {
      throw new Error(`${file} must contain one rule object, not ${typeof raw}.`);
    }

    // `$schema` is an editor affordance, not part of the rule — stripped for
    // the same reason `build-barrel.mjs` strips it, and the schema's
    // `additionalProperties: false` would otherwise reject the very line that
    // gives an author autocomplete.
    const { $schema: _schema, ...rule } = raw;

    if (!validateRule(rule)) {
      const problems = (validateRule.errors ?? [])
        .map((error) => `  ${error.instancePath || "/"} ${error.message ?? ""}`)
        .join("\n");
      throw new Error(`${file} is not a valid rule (rule.v1.json):\n${problems}`);
    }

    const valid = rule as unknown as Rule;
    const already = seen.get(valid.id);
    if (already !== undefined) {
      throw new Error(
        `${file} uses the rule id "${valid.id}", which is already in ${already}. ` +
          `Ids are permanent and unique; two rules sharing one make the same ` +
          `filing appear on the calendar twice.`,
      );
    }
    seen.set(valid.id, file);
    loaded.push(valid);
  }

  return loaded;
}

/** Say what was loaded, once per distinct answer rather than once per request. */
const announced = new Set<string>();
function announce(message: string): void {
  if (process.env.NODE_ENV === "test") return;
  if (announced.has(message)) return;
  announced.add(message);
  console.info(message);
}

/**
 * The operator's own rules, or none if they have not asked for any.
 *
 * An unset variable is the ordinary case and says nothing. A SET one always
 * reports its count — including zero, because "I pointed at the wrong directory
 * and it silently found nothing" is the failure this whole file exists to make
 * impossible.
 */
export function localRules(env: Record<string, string | undefined> = process.env): Rule[] {
  const dir = env[RULES_DIR_ENV];
  if (dir === undefined || dir === "") return [];

  const rules = loadRulesFrom(dir);
  announce(`[optima] extra rules: ${rules.length} loaded from ${dir}`);
  return rules;
}

/**
 * Everything the engine should be evaluated against: the shipped pack plus the
 * operator's own.
 *
 * The shipped pack is returned unchanged when there is nothing to add, so the
 * common install allocates nothing.
 */
export function allRules(env: Record<string, string | undefined> = process.env): readonly Rule[] {
  const extra = localRules(env);
  return extra.length === 0 ? ALL_RULES : [...ALL_RULES, ...extra];
}
