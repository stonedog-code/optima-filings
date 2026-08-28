# @optima-compliance/rules

Crowd-maintained US business compliance rule packs. **Every rule cites its
statute.**

The data half of **[Optima Filings](https://github.com/stonedog-code/optima-filings)**.
Evaluated by [`@optima-compliance/engine`](https://www.npmjs.com/package/@optima-compliance/engine),
which turns these rules plus an entity's facts into a filing calendar.

```bash
npm install @optima-compliance/rules @optima-compliance/engine
```

```ts
import { ALL_RULES } from "@optima-compliance/rules";
import { evaluate } from "@optima-compliance/engine";

evaluate(entity, ALL_RULES, { asOf: "2026-08-05" });
```

## ⚠️ Read this before showing a date to anyone

**Every rule currently shipped is `status: "active"`** — a person read the
primary source, and the date they read it is on the rule. The working is in
[`docs/rule-verification/`](https://github.com/stonedog-code/optima-filings/tree/main/docs/rule-verification)
in the repository, so you can check the reading rather than take it on trust.

What is thin is **coverage**: Washington, Oregon, Delaware and the federal 990
family, and nothing else. An entity outside those gets an empty calendar, which
means *"nothing is known here"* and never *"nothing is due"*.

A contributed rule may arrive as `draft` — written from general knowledge,
statute unread. `evaluate()` excludes drafts by default, so they cannot reach a
consumer who did not ask; `includeDraft: true` is a deliberate act, and every
obligation carries `status` so you can label what you show.

This is a compliance product. The first wrong deadline that costs somebody a
penalty is the credibility event the project does not recover from — so a rule
says what it is rather than looking finished.

## The bet

Compliance is a **data-coverage problem, not a software problem.** 50 states,
thousands of municipalities and a dozen entity types, with legislatures moving
deadlines and fees every session, is more than any one team can track.

So the rules are open, and the people who know them — CPAs, attorneys, business
owners — maintain their own jurisdictions by pull request.

**A rule is never paid.** If a deadline exists in the hosted product it exists
here, at the same accuracy, on the same day.

## What a rule looks like

```json
{
  "id": "us-wa-sos-corporation-annual-report",
  "jurisdiction": "US-WA",
  "title": "Profit Corporation Annual Report",
  "agency": "Washington Secretary of State",
  "entityTypes": ["s-corp", "c-corp", "b-corp"],
  "cadence": { "type": "annual", "anchor": "formation-month", "dayOfMonth": "last" },
  "fee": { "amountMinorUnits": 7000, "currency": "USD" },
  "citation": "RCW 23.95.255(2); WAC 434-112-060(1); WAC 434-112-085(7)(p)",
  "citationUrl": "https://app.leg.wa.gov/rcw/default.aspx?cite=23.95",
  "lastVerified": "2026-08-08",
  "status": "active",
  "effectiveFrom": "2020-01-01"
}
```

Validated against a published JSON Schema, shipped at
`@optima-compliance/rules/schema/rule.v1.json`.

## Five rules about the data

**Every rule cites its source.** A statute, form number, or the agency's own
page — never another compliance vendor, whose errors and liability you would be
importing. CI rejects a rule without a citation.

**Every rule carries `lastVerified`** — the date a human last read the primary
source. Bumping it without re-reading is *worse* than leaving it stale, because
it converts an honest "unknown" into a false "checked".

**Rules are temporal, not current.** `effectiveFrom` / `effectiveTo` are
required and superseded rules stay in the pack, so *"what was due in 2024"* is
answerable — which is what late filings and penalty calculations need.

**Superseding, not editing.** When a fee changes, the old rule gets an
`effectiveTo` and a new one is added. Overwriting destroys the historical answer
and hides the change from review.

**Money is integer minor units.** `6000` is $60.00. Never a float.

## Versioning — dates, not semver

`YYYY.M.PATCH`. This is **data**: it changes when a legislature does, and semver
does not describe that. `@optima-compliance/engine` is separately semver'd, because its
*behaviour* changes far less often than the rules do.

A **schema** change is what bumps `rule.v1.json` to `v2`; v1 rules keep working.

Pin exactly if a reproducible calendar matters to you. *"Which version said this
was due?"* is the first question asked when a deadline is disputed, and a caret
range makes it unanswerable from a lockfile.

## Contributing

The highest-value contribution is **a citation somebody checked.**

Rules live at `us/<state>/<slug>.json` in the
[repository](https://github.com/stonedog-code/optima-filings), organised by
jurisdiction rather than entity type — one Washington annual report covers
S-Corps, C-Corps and B-Corps at once.

Take a neighbouring rule, change three fields, submit. If you have not read the
primary source, mark it `draft` and say so — **a draft is a perfectly good
contribution**, and far better than a guess presented as fact.

If you would rather not open a pull request, the repository has an issue
template for *"a deadline or fee changed"* — jurisdiction, what changed, the
citation. Converting that to JSON takes five minutes.

Contributions require a [CLA](https://github.com/stonedog-code/optima-filings/blob/main/CLA.md).

## This is not legal or tax advice

Verify anything that matters against the primary source. The citation on every
rule is there so you can.

## Licence

**AGPL-3.0-only.** Copyright © 2026 StoneDogCode L.L.C.
